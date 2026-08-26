import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.models.schemas import KnowledgeChunk, ScoredKnowledgeChunk, KnowledgeDocument
from app.services.vector_store.base import VectorStore

logger = logging.getLogger(__name__)


class ChromaVectorStore(VectorStore):
    """
    Production-grade on-premise Vector Store backed by persistent ChromaDB.
    Maintains all vector embeddings, text chunks, and document provenance in:
    `backend/data/knowledge_base/chroma/`.
    """

    def __init__(self, persist_dir: str = "data/knowledge_base/chroma"):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.persist_dir.parent / "kb_documents_registry.json"
        
        self._client = None
        self._collection = None
        self._collection_name = "sovereign_knowledge_base"
        self._init_chroma()

    def _init_chroma(self):
        """Initialize the persistent ChromaDB client and collection."""
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            
            logger.info(f"Initializing ChromaDB PersistentClient at {self.persist_dir}")
            self._client = chromadb.PersistentClient(
                path=str(self.persist_dir),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            # Use cosine similarity space for standard dense embeddings
            self._collection = self._client.get_or_create_collection(
                name=self._collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(
                f"ChromaDB collection '{self._collection_name}' ready. "
                f"Existing chunks count: {self._collection.count()}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB PersistentClient: {e}")
            raise

    def _load_doc_registry(self) -> Dict[str, Dict[str, Any]]:
        if self.registry_file.exists():
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load doc registry: {e}")
        return {}

    def _save_doc_registry(self, registry: Dict[str, Dict[str, Any]]):
        try:
            temp_file = self.registry_file.with_suffix(".tmp")
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(registry, f, indent=2, default=str)
            temp_file.replace(self.registry_file)
        except Exception as e:
            logger.error(f"Failed to save document registry: {e}")

    async def add_document_chunks(
        self,
        document: KnowledgeDocument,
        chunks: List[KnowledgeChunk],
        embeddings: List[List[float]],
    ) -> None:
        """
        Add chunks, their genuine dense embeddings, and rich metadata to ChromaDB.
        """
        if not chunks:
            return

        if len(chunks) != len(embeddings):
            raise ValueError(f"Mismatch: {len(chunks)} chunks vs {len(embeddings)} embeddings.")

        ids = [c.id for c in chunks]
        docs = [c.content for c in chunks]
        metadatas = [
            {
                "document_id": c.document_id,
                "filename": c.filename,
                "page_number": c.page_number if c.page_number is not None else -1,
                "chunk_index": c.chunk_index,
                "char_count": c.char_count,
            }
            for c in chunks
        ]

        # Insert or update in ChromaDB collection
        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=docs,
            metadatas=metadatas,
        )

        # Update document registry
        registry = self._load_doc_registry()
        registry[document.id] = {
            "id": document.id,
            "filename": document.filename,
            "file_type": document.file_type,
            "total_chunks": len(chunks),
            "indexed_at": document.indexed_at,
            "status": document.status,
            "metadata": document.metadata,
        }
        self._save_doc_registry(registry)
        logger.info(f"Stored {len(chunks)} chunks for document '{document.filename}' ({document.id}) in ChromaDB.")

    async def query_similar(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        filter_document_id: Optional[str] = None,
    ) -> List[ScoredKnowledgeChunk]:
        """
        Query ChromaDB using cosine distance and return top-K scored chunks with metadata.
        """
        if self._collection.count() == 0:
            return []

        where_clause = None
        if filter_document_id:
            where_clause = {"document_id": filter_document_id}

        actual_k = min(top_k, self._collection.count())
        if actual_k <= 0:
            return []

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=actual_k,
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )

        scored_chunks: List[ScoredKnowledgeChunk] = []

        ids_list = results.get("ids", [[]])[0]
        docs_list = results.get("documents", [[]])[0]
        meta_list = results.get("metadatas", [[]])[0]
        dist_list = results.get("distances", [[]])[0]

        for i in range(len(ids_list)):
            c_id = ids_list[i]
            content = docs_list[i]
            meta = meta_list[i]
            dist = dist_list[i] if dist_list else 0.0

            # Chroma cosine distance is in [0, 2]. Similarity is 1 - distance.
            similarity = max(0.0, 1.0 - float(dist))

            page_num = meta.get("page_number")
            if page_num == -1:
                page_num = None

            chunk = KnowledgeChunk(
                id=c_id,
                document_id=meta.get("document_id", ""),
                filename=meta.get("filename", ""),
                chunk_index=int(meta.get("chunk_index", 0)),
                page_number=page_num,
                content=content,
                char_count=int(meta.get("char_count", len(content))),
            )

            scored_chunks.append(
                ScoredKnowledgeChunk(
                    chunk=chunk,
                    similarity_score=round(similarity, 4),
                )
            )

        # Sort by similarity score descending
        scored_chunks.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_chunks

    async def get_document_chunks(self, document_id: str) -> List[KnowledgeChunk]:
        """Retrieve all stored chunks for a specific document ID from ChromaDB."""
        results = self._collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"],
        )

        chunks: List[KnowledgeChunk] = []
        ids_list = results.get("ids", [])
        docs_list = results.get("documents", [])
        meta_list = results.get("metadatas", [])

        for i in range(len(ids_list)):
            c_id = ids_list[i]
            content = docs_list[i]
            meta = meta_list[i]

            page_num = meta.get("page_number")
            if page_num == -1:
                page_num = None

            chunks.append(
                KnowledgeChunk(
                    id=c_id,
                    document_id=meta.get("document_id", document_id),
                    filename=meta.get("filename", ""),
                    chunk_index=int(meta.get("chunk_index", 0)),
                    page_number=page_num,
                    content=content,
                    char_count=int(meta.get("char_count", len(content))),
                )
            )

        chunks.sort(key=lambda c: c.chunk_index)
        return chunks

    async def get_all_documents(self) -> List[KnowledgeDocument]:
        """Retrieve all indexed documents."""
        registry = self._load_doc_registry()
        docs: List[KnowledgeDocument] = []
        for doc_id, item in registry.items():
            docs.append(
                KnowledgeDocument(
                    id=doc_id,
                    filename=item.get("filename", "unknown"),
                    file_type=item.get("file_type", "txt"),
                    total_chunks=int(item.get("total_chunks", 0)),
                    indexed_at=item.get("indexed_at", datetime.now(timezone.utc).isoformat()),
                    status=item.get("status", "indexed"),
                    metadata=item.get("metadata", {}),
                )
            )
        docs.sort(key=lambda d: d.indexed_at, reverse=True)
        return docs

    async def delete_document(self, document_id: str) -> bool:
        """Delete all chunks and document registration from ChromaDB."""
        try:
            self._collection.delete(where={"document_id": document_id})
            registry = self._load_doc_registry()
            if document_id in registry:
                del registry[document_id]
                self._save_doc_registry(registry)
            logger.info(f"Deleted document '{document_id}' from ChromaDB.")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document '{document_id}' from ChromaDB: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get ChromaDB vector store statistics."""
        count = self._collection.count() if self._collection else 0
        registry = self._load_doc_registry()
        return {
            "total_documents": len(registry),
            "total_chunks": count,
            "vector_database": "ChromaDB",
            "collection_name": self._collection_name,
            "persist_dir": str(self.persist_dir),
            "sovereign_mode": True,
        }
