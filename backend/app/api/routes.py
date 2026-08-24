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
    ModelHealthResponse,
)
from app.services.document_service import DocumentService, get_document_service
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

