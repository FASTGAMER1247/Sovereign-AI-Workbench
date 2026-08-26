from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.models.schemas import KnowledgeChunk, ScoredKnowledgeChunk, KnowledgeDocument


class VectorStore(ABC):
    """
    Abstract Vector Store interface.
    Defines storage, persistence, deletion, and vector similarity querying contracts.
    """

    @abstractmethod
    async def add_document_chunks(
        self,
        document: KnowledgeDocument,
        chunks: List[KnowledgeChunk],
        embeddings: List[List[float]],
    ) -> None:
        """
        Store chunk documents, genuine vector embeddings, and rich provenance metadata into the store.
        """
        pass

    @abstractmethod
    async def query_similar(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        filter_document_id: Optional[str] = None,
    ) -> List[ScoredKnowledgeChunk]:
        """
        Execute vector similarity search and return top-K scored chunks with metadata.
        """
        pass

    @abstractmethod
    async def get_document_chunks(self, document_id: str) -> List[KnowledgeChunk]:
        """
        Retrieve all stored chunks for a specific document ID.
        """
        pass

    @abstractmethod
    async def get_all_documents(self) -> List[KnowledgeDocument]:
        """
        Retrieve metadata list of all indexed documents in the store.
        """
        pass

    @abstractmethod
    async def delete_document(self, document_id: str) -> bool:
        """
        Delete all chunks and embeddings associated with a document ID.
        """
        pass

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """
        Return telemetry on total documents, chunks, and storage path.
        """
        pass
