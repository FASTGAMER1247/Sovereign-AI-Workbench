import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.config import get_settings
from app.models.schemas import (
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeIngestResponse,
    KnowledgeStatsResponse,
    DocumentRecord,
)
from app.services.embedding.base import EmbeddingProvider
from app.services.vector_store.base import VectorStore

logger = logging.getLogger(__name__)


class KnowledgeService:
    """
    Coordinates chunking, embedding generation via EmbeddingProvider,
    and storage/management in persistent ChromaDB VectorStore.
    """

    def __init__(
        self,
        vector_store: VectorStore,
        embedding_provider: EmbeddingProvider,
        chunk_size: int = 600,
        chunk_overlap: int = 120,
    ):
        self.vector_store = vector_store
        self.embedding_provider = embedding_provider
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(
        self,
        text: str,
        document_id: str,
        filename: str,
        page_number: Optional[int] = None,
    ) -> List[KnowledgeChunk]:
        """
        Splits document text into paragraph-aware chunks with overlap, preserving exact provenance.
        """
        if not text or not text.strip():
            return []

        chunks: List[KnowledgeChunk] = []
        paragraphs = text.split("\n\n")

        current_buffer = []
        current_length = 0
        chunk_idx = 0

        for para in paragraphs:
            para_clean = para.strip()
            if not para_clean:
                continue

            para_len = len(para_clean)

            if current_length + para_len > self.chunk_size and current_buffer:
                # Flush current buffer
                chunk_content = "\n\n".join(current_buffer)
                chunks.append(
                    KnowledgeChunk(
                        id=f"chk_{document_id}_{chunk_idx}",
                        document_id=document_id,
                        filename=filename,
                        chunk_index=chunk_idx,
                        page_number=page_number,
                        content=chunk_content,
                        char_count=len(chunk_content),
                    )
                )
                chunk_idx += 1

                # Keep overlap from previous buffer if possible
                overlap_chars = 0
                kept_buffer = []
                for p in reversed(current_buffer):
                    if overlap_chars + len(p) <= self.chunk_overlap:
                        kept_buffer.insert(0, p)
                        overlap_chars += len(p)
                    else:
                        break
                current_buffer = kept_buffer
                current_length = sum(len(p) for p in current_buffer)

            current_buffer.append(para_clean)
            current_length += para_len

        # Flush any remaining text in buffer
        if current_buffer:
            chunk_content = "\n\n".join(current_buffer)
            chunks.append(
                KnowledgeChunk(
                    id=f"chk_{document_id}_{chunk_idx}",
                    document_id=document_id,
                    filename=filename,
                    chunk_index=chunk_idx,
                    page_number=page_number,
                    content=chunk_content,
                    char_count=len(chunk_content),
                )
            )

        return chunks

    async def ingest_text(
        self,
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> KnowledgeIngestResponse:
        """
        Ingest direct text / standard into ChromaDB.
        Chunks text, generates real dense embeddings, and stores in ChromaDB.
        """
        if not content or not content.strip():
            raise ValueError("Document content cannot be empty.")

        doc_id = f"kb_text_{uuid.uuid4().hex[:8]}"
        filename = title.strip() if title else f"standard_{doc_id}.txt"

        chunks = self.chunk_text(
            text=content,
            document_id=doc_id,
            filename=filename,
        )

        if not chunks:
            raise ValueError("Could not extract any valid text chunks from content.")

        # Generate genuine dense embeddings via active EmbeddingProvider
        chunk_texts = [c.content for c in chunks]
        embeddings = await self.embedding_provider.embed_batch(chunk_texts)

        indexed_at_iso = datetime.now(timezone.utc).isoformat()
        file_ext = filename.split(".")[-1].lower() if "." in filename else "txt"
        doc = KnowledgeDocument(
            id=doc_id,
            filename=filename,
            file_type=file_ext,
            total_chunks=len(chunks),
            indexed_at=indexed_at_iso,
            status="indexed",
            metadata=metadata or {},
        )

        # Store chunks and embeddings into ChromaDB
        await self.vector_store.add_document_chunks(
            document=doc,
            chunks=chunks,
            embeddings=embeddings,
        )

        logger.info(f"Ingested standard '{filename}' into ChromaDB ({len(chunks)} chunks).")

        return KnowledgeIngestResponse(
            document_id=doc_id,
            filename=filename,
            total_chunks=len(chunks),
            indexed_at=indexed_at_iso,
            message=f"Successfully indexed '{filename}' ({len(chunks)} chunks into ChromaDB).",
        )

    async def ingest_extracted_document(
        self,
        doc_record: DocumentRecord,
        extracted_text: str,
    ) -> KnowledgeIngestResponse:
        """
        Index an uploaded document from Milestone 2 into the ChromaDB Knowledge Base.
        """
        doc_id = doc_record.document_id
        filename = doc_record.original_filename

        chunks = self.chunk_text(
            text=extracted_text,
            document_id=doc_id,
            filename=filename,
        )

        if not chunks:
            raise ValueError("No text content available to chunk and index.")

        chunk_texts = [c.content for c in chunks]
        embeddings = await self.embedding_provider.embed_batch(chunk_texts)

        indexed_at_iso = datetime.now(timezone.utc).isoformat()
        doc = KnowledgeDocument(
            id=doc_id,
            filename=filename,
            file_type=doc_record.file_type,
            total_chunks=len(chunks),
            indexed_at=indexed_at_iso,
            status="indexed",
            metadata={
                "file_type": doc_record.file_type,
                "file_size_bytes": doc_record.file_size_bytes,
                "upload_timestamp": str(doc_record.upload_timestamp) if doc_record.upload_timestamp else indexed_at_iso,
            },
        )

        await self.vector_store.add_document_chunks(
            document=doc,
            chunks=chunks,
            embeddings=embeddings,
        )

        return KnowledgeIngestResponse(
            document_id=doc_id,
            filename=filename,
            total_chunks=len(chunks),
            indexed_at=indexed_at_iso,
            message=f"Successfully indexed document '{filename}' ({len(chunks)} chunks into ChromaDB).",
        )

    async def get_all_documents(self) -> List[KnowledgeDocument]:
        return await self.vector_store.get_all_documents()

    async def get_document_chunks(self, document_id: str) -> List[KnowledgeChunk]:
        return await self.vector_store.get_document_chunks(document_id)

    async def delete_document(self, document_id: str) -> bool:
        return await self.vector_store.delete_document(document_id)

    def get_stats(self) -> KnowledgeStatsResponse:
        store_stats = self.vector_store.get_stats()
        emb_info = self.embedding_provider.get_provider_info()
        return KnowledgeStatsResponse(
            total_documents=store_stats.get("total_documents", 0),
            total_chunks=store_stats.get("total_chunks", 0),
            embedding_engine=emb_info.get("provider", "ollama"),
            embedding_model=emb_info.get("model", "nomic-embed-text"),
            storage_path=store_stats.get("persist_dir", "data/knowledge_base/chroma"),
        )


_global_knowledge_service: Optional[KnowledgeService] = None


def get_knowledge_service() -> KnowledgeService:
    global _global_knowledge_service
    if _global_knowledge_service is None:
        from app.config import get_settings
        from app.services.embedding import get_embedding_provider
        from app.services.vector_store import get_vector_store

        settings = get_settings()
        embedder = get_embedding_provider(settings)
        vector_store = get_vector_store(settings)
        _global_knowledge_service = KnowledgeService(
            vector_store=vector_store,
            embedding_provider=embedder,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
    return _global_knowledge_service
