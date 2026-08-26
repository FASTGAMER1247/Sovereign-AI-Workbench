import logging
from typing import Optional

from app.config import get_settings, Settings
from app.services.embedding.base import EmbeddingProvider
from app.services.embedding.ollama_embedding import OllamaEmbeddingProvider
from app.services.embedding.sentence_transformer_embedding import SentenceTransformerEmbeddingProvider

logger = logging.getLogger(__name__)

_active_embedding_provider: Optional[EmbeddingProvider] = None


def get_embedding_provider(settings: Optional[Settings] = None) -> EmbeddingProvider:
    """
    Factory function to obtain the configured genuine EmbeddingProvider singleton.
    Enforces real dense embedding models exclusively.
    """
    global _active_embedding_provider
    if _active_embedding_provider is not None:
        return _active_embedding_provider

    if settings is None:
        settings = get_settings()

    provider_type = settings.EMBEDDING_PROVIDER.lower().strip()
    model_name = settings.EMBEDDING_MODEL

    if provider_type == "ollama":
        logger.info(f"Initializing OllamaEmbeddingProvider with model: {model_name} at {settings.OLLAMA_BASE_URL}")
        _active_embedding_provider = OllamaEmbeddingProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model_name=model_name,
            timeout=settings.OLLAMA_TIMEOUT_SECONDS,
        )
    elif provider_type in ("sentence_transformers", "sentence_transformer", "local"):
        logger.info(f"Initializing SentenceTransformerEmbeddingProvider with model: {model_name}")
        _active_embedding_provider = SentenceTransformerEmbeddingProvider(
            model_name=model_name or "all-MiniLM-L6-v2"
        )
    else:
        logger.warning(
            f"Unknown EMBEDDING_PROVIDER '{provider_type}', defaulting to OllamaEmbeddingProvider with '{model_name}'"
        )
        _active_embedding_provider = OllamaEmbeddingProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model_name=model_name,
            timeout=settings.OLLAMA_TIMEOUT_SECONDS,
        )

    return _active_embedding_provider


__all__ = [
    "EmbeddingProvider",
    "OllamaEmbeddingProvider",
    "SentenceTransformerEmbeddingProvider",
    "get_embedding_provider",
]
