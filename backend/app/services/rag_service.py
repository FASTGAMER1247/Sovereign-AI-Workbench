import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from app.models.schemas import ChatMessage, ChatRequest, GroundedCitation, RAGAuditResponse, ScoredKnowledgeChunk
from app.services.retrieval_service import RetrievalService
from app.services.model_service import ModelService

logger = logging.getLogger(__name__)


class RAGService:
    """
    Retrieval-Augmented Generation Service.
    Coordinates retrieval of grounded standards from ChromaDB, constructs context
    with exact provenance metadata, and invokes local LLM (qwen2.5-coder:1.5b) for deterministic audits.
    """

    def __init__(self, retrieval_service: RetrievalService, model_service: ModelService):
        self.retrieval_service = retrieval_service
        self.model_service = model_service

    def build_grounded_context(
        self, scored_chunks: List[ScoredKnowledgeChunk]
    ) -> Tuple[str, List[GroundedCitation]]:
        """
        Formats retrieved ChromaDB chunks into structured context blocks and
        constructs verified source citation objects with real metadata.
        """
        if not scored_chunks:
            return "No matching organizational standards or SOPs found in Knowledge Base.", []

        context_blocks = []
        citations: List[GroundedCitation] = []

        for idx, scored in enumerate(scored_chunks, 1):
            chunk = scored.chunk
            citation = GroundedCitation(
                document_id=chunk.document_id,
                document_name=chunk.filename,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                similarity_score=round(scored.similarity_score, 4),
                excerpt=chunk.content[:250] + ("..." if len(chunk.content) > 250 else ""),
            )
            citations.append(citation)

            page_info = f", Page {chunk.page_number}" if chunk.page_number else ""
            block = (
                f"[REFERENCE #{idx}: Standard='{chunk.filename}'{page_info}, Chunk #{chunk.chunk_index}]\n"
                f"{chunk.content}\n"
            )
            context_blocks.append(block)

        grounded_context = "\n---\n".join(context_blocks)
        return grounded_context, citations

    async def rag_audit_document(
        self,
        document_id: str,
        document_name: str,
        extracted_text: str,
        custom_focus: Optional[str] = None,
        top_k: int = 4,
        filter_document_id: Optional[str] = None,
    ) -> RAGAuditResponse:
        """
        Performs a grounded compliance audit on an uploaded document against the ChromaDB knowledge base.
        """
        logger.info(
            f"Initiating RAG compliance audit for '{document_name}' ({document_id}) against ChromaDB..."
        )

        # 1. Retrieve most relevant standards from ChromaDB
        search_query = custom_focus if custom_focus else extracted_text[:400]
        query_response = await self.retrieval_service.search(
            query=search_query,
            top_k=top_k,
            filter_document_id=filter_document_id,
        )

        # 2. Build verified grounded context and citations directly from ChromaDB metadata
        grounded_context, citations = self.build_grounded_context(query_response.results)

        # 3. Construct prompt with strict factual anchoring
        system_instruction = (
            "You are a Senior Industrial Safety & Compliance Auditor for an air-gapped confidential facility. "
            "Evaluate the provided Document Findings strictly against the Grounded Organizational Standards & SOPs. "
            "Follow these rules:\n"
            "1. Check if any observed values exceed maximum allowable tolerances or safety thresholds.\n"
            "2. Reference the exact Standard Name and Page Number from the Grounded Standards for every rule cited.\n"
            "3. If the Grounded Standards do not cover a specific finding, clearly state 'No specific SOP threshold retrieved'.\n"
            "4. Provide a structured audit: (A) Compliance Verdict, (B) Critical Deviations & SOP Violations, (C) Mandated Remediation Timeline."
        )

        user_content = (
            f"=== GROUNDED ORGANIZATIONAL STANDARDS & SOPS (FROM LOCAL KNOWLEDGE BASE) ===\n"
            f"{grounded_context}\n\n"
            f"=== DOCUMENT TO AUDIT: {document_name} ===\n"
            f"{extracted_text}\n\n"
        )
        if custom_focus:
            user_content += f"Specific Audit Focus requested: {custom_focus}\n\n"

        user_content += "Perform the compliance audit now citing the retrieved standards accurately."

        # Dispatch inference to local model service
        chat_req = ChatRequest(
            messages=[
                ChatMessage(role="system", content=system_instruction),
                ChatMessage(role="user", content=user_content),
            ],
            temperature=0.2,
            max_tokens=1200,
        )
        chat_resp = await self.model_service.generate_chat(chat_req)

        return RAGAuditResponse(
            document_id=document_id,
            filename=document_name,
            analysis=chat_resp.response,
            grounded_citations=citations,
            model=chat_resp.model,
            provider=chat_resp.provider,
            duration_ms=chat_resp.total_duration_ms,
            prompt_tokens=chat_resp.prompt_eval_count,
            completion_tokens=chat_resp.eval_count,
            created_at=datetime.now(timezone.utc).isoformat(),
        )


# Singleton factory
_rag_service_instance: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _rag_service_instance
    if _rag_service_instance is None:
        from app.services.model_service import get_model_service
        from app.services.retrieval_service import get_retrieval_service
        _rag_service_instance = RAGService(
            retrieval_service=get_retrieval_service(),
            model_service=get_model_service(),
        )
    return _rag_service_instance
