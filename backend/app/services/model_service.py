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

    DEFAULT_SYSTEM_PROMPT = (
        "You are Sovereign Copilot, the intelligent sovereign AI assistant of Sovereign AI Workbench.\n"
        "You operate 100% locally and air-gapped on the host workstation with hardware acceleration (NVIDIA GeForce RTX 5050 Laptop GPU, 8GB VRAM).\n\n"
        "Key System Capabilities & Integrated Tooling:\n"
        "- Image Generation: The workbench has a built-in, local Stable Diffusion Turbo (SD-Turbo) engine running directly on CUDA (<1s per image). When users ask if you can generate images or photos, answer YES! Explain that they can simply type 'generate an image of...', 'draw...', or 'photo of...' to synthesize visuals locally.\n"
        "- Multimodal Vision & OCR: You can inspect uploaded images, diagrams, blueprints, and documents using local vision models (LLaVA and Moondream).\n"
        "- Document & PDF Intelligence: The workbench can parse, audit, and generate industrial compliance reports in both PDF (.pdf) and DOCX (.docx) formats using PyMuPDF.\n"
        "- Python Sandbox: Secure local code execution with AST safety analysis.\n"
        "- Local RAG: Semantic search and document intelligence using ChromaDB and nomic-embed-text.\n"
        "- Video Generation: Full-scale text-to-video models (e.g. Wan2.1, CogVideoX, uncompressed SVD) typically require 16GB-24GB VRAM for temporal sequence rendering. Generative video pipelines are actively being optimized for 8GB VRAM with quantization, while sub-second image synthesis is fully operational on your 8GB RTX 5050 GPU.\n\n"
        "Always provide helpful, precise, and concise responses. Never claim to be a purely text-only model unable to generate images."
    )

    def get_provider(self, provider_name: str = "ollama") -> ModelProvider:
        provider = self._providers.get(provider_name)
        if not provider:
            raise ValueError(f"Unknown model provider: '{provider_name}'. Available: {list(self._providers.keys())}")
        return provider

    async def generate_chat(self, request: ChatRequest) -> ChatResponse:
        messages = list(request.get_effective_messages())
        if not any(m.role == "system" for m in messages):
            messages = [ChatMessage(role="system", content=self.DEFAULT_SYSTEM_PROMPT)] + messages

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
        messages = list(request.get_effective_messages())
        if not any(m.role == "system" for m in messages):
            messages = [ChatMessage(role="system", content=self.DEFAULT_SYSTEM_PROMPT)] + messages

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
