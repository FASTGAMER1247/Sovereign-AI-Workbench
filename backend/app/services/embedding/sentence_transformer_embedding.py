import logging
from typing import List, Dict, Any, Optional

from app.services.embedding.base import EmbeddingProvider

logger = logging.getLogger(__name__)


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    """
    Genuine local sentence-transformers embedding provider.
    Runs completely offline using models like 'all-MiniLM-L6-v2' (384-dimensional dense vectors).
    This serves as a genuine local fallback if Ollama embeddings are unavailable.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self._model_name = model_name
        self._model = None
        self._dimension = 384

    def _load_model(self):
        if self._model is not None:
            return self._model
        
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading local SentenceTransformer model: {self._model_name}")
            self._model = SentenceTransformer(self._model_name)
            return self._model
        except ImportError:
            # Fallback to chromadb's ONNX miniLM embedding function if available
            try:
                import chromadb.utils.embedding_functions as ef
                logger.info(f"Using ChromaDB ONNX embedding function for {self._model_name}")
                self._model = ef.ONNXMiniLM_L6_V2()
                return self._model
            except Exception as e:
                raise RuntimeError(
                    f"SentenceTransformers / ONNX embedding support is not installed. "
                    f"Please install 'sentence-transformers' or run Ollama with 'nomic-embed-text'. Error: {e}"
                )

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    async def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text.")
        
        model = self._load_model()
        if hasattr(model, "encode"):
            vector = model.encode(text.strip())
            return vector.tolist() if hasattr(vector, "tolist") else list(vector)
        elif callable(model):
            # ChromaDB embedding function returns list of vectors for list of texts
            vectors = model([text.strip()])
            return list(vectors[0])
        else:
            raise RuntimeError(f"Unsupported model interface for {type(model)}")

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        
        model = self._load_model()
        cleaned = [t.strip() for t in texts]
        if hasattr(model, "encode"):
            vectors = model.encode(cleaned)
            return [v.tolist() if hasattr(v, "tolist") else list(v) for v in vectors]
        elif callable(model):
            vectors = model(cleaned)
            return [list(v) for v in vectors]
        else:
            raise RuntimeError(f"Unsupported model interface for {type(model)}")

    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "provider": "sentence_transformers",
            "model": self._model_name,
            "dimension": self.dimension,
            "sovereign_mode": True,
        }
