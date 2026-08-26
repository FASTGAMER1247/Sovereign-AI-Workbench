import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from app.config import Settings, get_settings
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    DocumentExtractionResponse,
    DocumentResponse,
    HealthResponse,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeIngestRequest,
    KnowledgeIngestResponse,
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
    KnowledgeStatsResponse,
    ModelHealthResponse,
    RAGAuditRequest,
    RAGAuditResponse,
)
from app.services.document_service import DocumentService, get_document_service
from app.services.knowledge_service import KnowledgeService, get_knowledge_service
from app.services.model_service import ModelService, get_model_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Sovereign AI"])


@router.get("/health", response_model=HealthResponse)
async def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Backend system health check."""
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version="0.1.0",
        sovereign_mode=True,
    )


@router.get("/models/health", response_model=ModelHealthResponse)
async def get_models_health(
    model_service: ModelService = Depends(get_model_service),
) -> ModelHealthResponse:
    """Check Ollama connectivity and whether the designated development model is available."""
    try:
        return await model_service.check_health()
    except Exception as e:
        logger.exception("Error checking model health")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model service health check failed: {str(e)}",
        )


@router.get("/models")
async def list_models(
    model_service: ModelService = Depends(get_model_service),
) -> Dict[str, Any]:
    """List all installed local models."""
    try:
        models = await model_service.list_available_models()
        return {"models": models, "count": len(models)}
    except Exception as e:
        logger.exception("Error listing models")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list local models: {str(e)}",
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    model_service: ModelService = Depends(get_model_service),
) -> ChatResponse:
    """Execute a prompt against the local Ollama LLM."""
    try:
        response = await model_service.generate_chat(request)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        logger.exception("Unexpected error during chat completion")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat generation encountered an error: {str(e)}",
        )


# ─── Document Endpoints (Milestone 2) ───

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    """Upload and securely register a PDF or image document."""
    return await doc_service.save_uploaded_file(file)


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    doc_service: DocumentService = Depends(get_document_service),
) -> List[DocumentResponse]:
    """List all ingested documents."""
    return doc_service.list_documents()


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    """Get metadata for a specific document."""
    return doc_service.get_document(document_id)


@router.post("/documents/{document_id}/extract", response_model=DocumentExtractionResponse)
async def extract_document_text(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentExtractionResponse:
    """Extract text from a document using PyMuPDF (for PDFs) or local Vision (for Images)."""
    return await doc_service.extract_text(document_id)


@router.post("/documents/{document_id}/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document(
    document_id: str,
    request: DocumentAnalysisRequest = DocumentAnalysisRequest(),
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentAnalysisResponse:
    """Run local AI analysis on a document."""
    return await doc_service.analyze_document(document_id, request)


@router.post("/documents/{document_id}/rag-audit", response_model=RAGAuditResponse)
async def rag_audit_document(
    document_id: str,
    request: RAGAuditRequest = RAGAuditRequest(),
    doc_service: DocumentService = Depends(get_document_service),
) -> RAGAuditResponse:
    """Run RAG-grounded document audit cross-referencing organizational standards and SOPs."""
    return await doc_service.rag_audit_document(document_id, request)


# ─── Knowledge Base & Vector Store Endpoints (Milestone 3) ───

_global_knowledge_service = None
_global_retrieval_service = None


def get_knowledge_service(settings: Settings = Depends(get_settings)) -> KnowledgeService:
    global _global_knowledge_service
    if _global_knowledge_service is None:
        from app.services.embedding import get_embedding_provider
        from app.services.vector_store import get_vector_store
        
        embedding_provider = get_embedding_provider(settings)
        vector_store = get_vector_store(settings)
        _global_knowledge_service = KnowledgeService(
            vector_store=vector_store,
            embedding_provider=embedding_provider,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
    return _global_knowledge_service


def get_retrieval_service(settings: Settings = Depends(get_settings)):
    global _global_retrieval_service
    if _global_retrieval_service is None:
        from app.services.embedding import get_embedding_provider
        from app.services.vector_store import get_vector_store
        from app.services.retrieval_service import RetrievalService

        embedding_provider = get_embedding_provider(settings)
        vector_store = get_vector_store(settings)
        _global_retrieval_service = RetrievalService(
            embedding_provider=embedding_provider,
            vector_store=vector_store,
        )
    return _global_retrieval_service


@router.post("/knowledge/ingest", response_model=KnowledgeIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_knowledge(
    request: KnowledgeIngestRequest,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
    doc_service: DocumentService = Depends(get_document_service),
) -> KnowledgeIngestResponse:
    """Ingest a registered document or direct standard text into the persistent ChromaDB vector store."""
    if request.document_id:
        doc = doc_service.get_document(request.document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{request.document_id}' not found in registry."
            )
        
        # Ensure document text is extracted
        raw_doc = doc_service._registry.get(request.document_id, {})
        extracted_text = raw_doc.get("extracted_text")
        if not extracted_text:
            extracted_res = await doc_service.extract_text(request.document_id)
            extracted_text = extracted_res.extracted_text

        from app.models.schemas import DocumentRecord
        doc_record = DocumentRecord(
            document_id=doc.id,
            original_filename=doc.filename,
            file_type=doc.file_type,
            file_size_bytes=doc.size_bytes,
            storage_path=raw_doc.get("storage_path", ""),
            upload_timestamp=raw_doc.get("created_at"),
            extracted_text=extracted_text,
        )

        return await kb_service.ingest_extracted_document(
            doc_record=doc_record,
            extracted_text=extracted_text,
        )
    elif request.content and request.title:
        return await kb_service.ingest_text(
            title=request.title,
            content=request.content,
            metadata=request.metadata or {"source": "direct_text_entry"},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either 'document_id' or both 'title' and 'content'."
        )


@router.get("/knowledge/documents", response_model=List[KnowledgeDocument])
async def list_knowledge_documents(
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> List[KnowledgeDocument]:
    """List all organizational documents and standards indexed in ChromaDB."""
    return await kb_service.get_all_documents()


@router.get("/knowledge/documents/{document_id}", response_model=KnowledgeDocument)
async def get_knowledge_document(
    document_id: str,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeDocument:
    """Get metadata for a specific indexed document."""
    docs = await kb_service.get_all_documents()
    for d in docs:
        if d.id == document_id:
            return d
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Knowledge document with ID '{document_id}' not found in ChromaDB."
    )


@router.get("/knowledge/documents/{document_id}/chunks", response_model=List[KnowledgeChunk])
async def get_knowledge_document_chunks(
    document_id: str,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> List[KnowledgeChunk]:
    """Inspect all chunks for a specific indexed document from ChromaDB."""
    chunks = await kb_service.get_document_chunks(document_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No chunks found for document ID '{document_id}' in ChromaDB."
        )
    return chunks


@router.delete("/knowledge/documents/{document_id}")
async def delete_knowledge_document(
    document_id: str,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> Dict[str, Any]:
    """Delete a document and all associated embeddings from ChromaDB."""
    deleted = await kb_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge document '{document_id}' not found in ChromaDB."
        )
    return {"status": "deleted", "document_id": document_id}


@router.post("/knowledge/query", response_model=KnowledgeQueryResponse)
async def query_knowledge(
    request: KnowledgeQueryRequest,
    retrieval_service = Depends(get_retrieval_service),
) -> KnowledgeQueryResponse:
    """Execute natural language semantic search across indexed standards in ChromaDB."""
    return await retrieval_service.search(
        query=request.query,
        top_k=request.top_k,
        filter_document_id=request.filter_document_id,
    )


@router.get("/knowledge/stats", response_model=KnowledgeStatsResponse)
async def get_knowledge_stats(
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeStatsResponse:
    """Get ChromaDB vector store statistics, total chunks, and active embedding model info."""
    return kb_service.get_stats()


