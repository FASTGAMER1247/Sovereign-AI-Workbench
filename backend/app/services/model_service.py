import logging
from typing import AsyncGenerator, Dict, List, Optional
from app.config import Settings, get_settings
from app.models.base import ModelProvider
from app.models.ollama_provider import OllamaProvider
from app.models.schemas import ChatMessage, ChatRequest, ChatResponse, ModelHealthResponse

logger = logging.getLogger(__name__)


class ModelService:
    """Service layer managing local model providers and routing requests.
    
    Provides high-level methods for model generation, streaming, model verification,
    and capability checks.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._providers: Dict[str, ModelProvider] = {}
        self._initialize_providers()

    def _initialize_providers(self) -> None:
        """Register the local Ollama provider."""
        ollama_provider = OllamaProvider(
            base_url=self.settings.OLLAMA_BASE_URL,
            default_model=self.settings.DEFAULT_MODEL,
            timeout_seconds=self.settings.OLLAMA_TIMEOUT_SECONDS,
        )
        self._providers["ollama"] = ollama_provider
        logger.info(
            f"Initialized OllamaProvider at {self.settings.OLLAMA_BASE_URL} "
            f"with default model {self.settings.DEFAULT_MODEL}"
        )

    def get_provider(self, provider_name: str = "ollama") -> ModelProvider:
        provider = self._providers.get(provider_name)
        if not provider:
            raise ValueError(f"Unknown model provider: '{provider_name}'. Available: {list(self._providers.keys())}")
        return provider

    async def generate_chat(self, request: ChatRequest) -> ChatResponse:
        messages = request.get_effective_messages()
        model = request.model or self.settings.DEFAULT_MODEL
        provider = self.get_provider("ollama")
        
        logger.info(f"Generating completion with model '{model}' via Ollama provider")
        return await provider.generate(
            messages=messages,
            model=model,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens,
        )

    async def stream_chat(self, request: ChatRequest) -> AsyncGenerator[str, None]:
        messages = request.get_effective_messages()
        model = request.model or self.settings.DEFAULT_MODEL
        provider = self.get_provider("ollama")
        
        logger.info(f"Streaming completion with model '{model}' via Ollama provider")
        async for chunk in provider.stream(
            messages=messages,
            model=model,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens,
        ):
            yield chunk

    async def check_health(self) -> ModelHealthResponse:
        provider = self.get_provider("ollama")
        return await provider.health()

    async def list_available_models(self) -> List[Dict]:
        provider = self.get_provider("ollama")
        return await provider.list_models()

    def set_default_model(self, model_name: str) -> None:
        """Dynamically update the default model on settings and active providers."""
        self.settings.DEFAULT_MODEL = model_name
        provider = self._providers.get("ollama")
        if provider and hasattr(provider, "default_model"):
            provider.default_model = model_name
        logger.info(f"Updated default model to '{model_name}'")

    async def pull_model(self, model_name: str) -> Dict:
        """Request local provider to pull/download the specified model."""
        provider = self.get_provider("ollama")
        if hasattr(provider, "pull_model"):
            return await provider.pull_model(model_name)
        raise NotImplementedError("Active provider does not support pull_model")



_global_model_service: Optional[ModelService] = None


def get_model_service() -> ModelService:
    global _global_model_service
    if _global_model_service is None:
        _global_model_service = ModelService()
    return _global_model_service
