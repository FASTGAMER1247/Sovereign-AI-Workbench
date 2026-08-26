import logging
from typing import Optional

from app.config import get_settings, Settings
from app.services.vector_store.base import VectorStore
from app.services.vector_store.chroma_store import ChromaVectorStore

logger = logging.getLogger(__name__)

_active_vector_store: Optional[VectorStore] = None


def get_vector_store(settings: Optional[Settings] = None) -> VectorStore:
    """
    Factory function to obtain the configured persistent ChromaVectorStore singleton.
    """
    global _active_vector_store
    if _active_vector_store is not None:
        return _active_vector_store

    if settings is None:
        settings = get_settings()

    persist_dir = settings.CHROMA_PERSIST_DIR
    logger.info(f"Initializing ChromaVectorStore with persist_dir: {persist_dir}")
    _active_vector_store = ChromaVectorStore(persist_dir=persist_dir)
    return _active_vector_store


__all__ = [
    "VectorStore",
    "ChromaVectorStore",
    "get_vector_store",
]
