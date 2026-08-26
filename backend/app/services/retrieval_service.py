import time
import logging
from typing import Optional, List

from app.models.schemas import KnowledgeQueryResponse, ScoredKnowledgeChunk
from app.services.embedding.base import EmbeddingProvider
from app.services.vector_store.base import VectorStore

logger = logging.getLogger(__name__)


class RetrievalService:
    """
    Dedicated Retrieval Service responsible for:
    1. Embedding user/audit queries using the active EmbeddingProvider.
    2. Executing vector similarity search against the persistent ChromaDB VectorStore.
    3. Filtering, ranking, and scoring relevant document chunks.
    """

    def __init__(self, embedding_provider: EmbeddingProvider, vector_store: VectorStore):
        self.embedding_provider = embedding_provider
        self.vector_store = vector_store

    async def search(
        self,
        query: str,
        top_k: int = 4,
        filter_document_id: Optional[str] = None,
    ) -> KnowledgeQueryResponse:
        """
        Execute an on-premise semantic search across indexed standards/manuals in ChromaDB.
        """
        if not query or not query.strip():
            return KnowledgeQueryResponse(
                query="",
                results=[],
                total_matched=0,
                query_time_ms=0.0,
            )

        start_time = time.perf_counter()
        
        # Generate genuine dense embedding vector for the query text
        query_embedding = await self.embedding_provider.embed_text(query.strip())
        
        # Search persistent ChromaDB
        results = await self.vector_store.query_similar(
            query_embedding=query_embedding,
            top_k=top_k,
            filter_document_id=filter_document_id,
        )
        
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return KnowledgeQueryResponse(
            query=query.strip(),
            results=results,
            total_matched=len(results),
            query_time_ms=round(elapsed_ms, 2),
        )

    async def retrieve_top_chunks(
        self,
        query: str,
        top_k: int = 4,
        filter_document_id: Optional[str] = None,
    ) -> List[ScoredKnowledgeChunk]:
        """
        Helper method returning pure list of ScoredKnowledgeChunks for RAG pipelines.
        """
        resp = await self.search(query=query, top_k=top_k, filter_document_id=filter_document_id)
        return resp.results
