import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.config import Settings, get_settings
from app.models.schemas import ChatRequest, ChatResponse, HealthResponse, ModelHealthResponse
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
