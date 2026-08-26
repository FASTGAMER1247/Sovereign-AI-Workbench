"""
Deprecated legacy module.
Please import from `app.services.embedding` instead.
"""
from app.services.embedding import (
    EmbeddingProvider,
    OllamaEmbeddingProvider,
    SentenceTransformerEmbeddingProvider,
    get_embedding_provider,
)

# Backwards-compatibility alias
EmbeddingService = EmbeddingProvider
get_embedding_service = get_embedding_provider
