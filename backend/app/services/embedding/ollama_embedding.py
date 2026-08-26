import logging
from typing import List, Dict, Any, Optional
import httpx

from app.services.embedding.base import EmbeddingProvider

logger = logging.getLogger(__name__)


class OllamaEmbeddingProvider(EmbeddingProvider):
    """
    Dedicated embedding provider that generates genuine dense vector embeddings
    via the local Ollama embeddings API using dedicated models like `nomic-embed-text`.
    """

    def __init__(self, base_url: str = "http://127.0.0.1:11434", model_name: str = "nomic-embed-text", timeout: float = 60.0):
        self.base_url = base_url.rstrip("/")
        self._model_name = model_name
        self.timeout = timeout
        self._dimension: Optional[int] = None
        self._is_verified: bool = False

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def dimension(self) -> int:
        if self._dimension is not None:
            return self._dimension
        return 768  # nomic-embed-text standard dense vector length

    async def verify_availability(self) -> bool:
        """
        Check whether the local Ollama instance is reachable and has the requested embedding model installed.
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code != 200:
                    logger.warning(f"Ollama returned status {resp.status_code} while checking models.")
                    return False
                
                tags_data = resp.json()
                models = [m.get("name", "").split(":")[0] for m in tags_data.get("models", [])]
                full_names = [m.get("name", "") for m in tags_data.get("models", [])]
                
                target_base = self._model_name.split(":")[0]
                if target_base in models or self._model_name in full_names:
                    self._is_verified = True
                    return True
                
                logger.error(
                    f"Required embedding model '{self._model_name}' is not installed in Ollama. "
                    f"Installed models: {full_names}. "
                    f"To install, run: 'ollama pull {self._model_name}'"
                )
                return False
        except Exception as e:
            logger.error(f"Failed to connect to local Ollama at {self.base_url}: {e}")
            return False

    async def embed_text(self, text: str) -> List[float]:
        """
        Generate a genuine dense embedding vector for a single text chunk or query.
        """
        if not text or not text.strip():
            raise ValueError("Cannot embed empty text.")

        payload = {
            "model": self._model_name,
            "prompt": text.strip(),
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(f"{self.base_url}/api/embeddings", json=payload)
                
                if resp.status_code == 404:
                    raise RuntimeError(
                        f"Ollama embedding model '{self._model_name}' not found. "
                        f"Please execute: 'ollama pull {self._model_name}'"
                    )
                
                if resp.status_code != 200:
                    raise RuntimeError(
                        f"Ollama embeddings API returned status {resp.status_code}: {resp.text}"
                    )

                data = resp.json()
                embedding = data.get("embedding")
                
                if not embedding or not isinstance(embedding, list):
                    raise RuntimeError(f"Ollama did not return a valid embedding vector: {data}")

                if self._dimension is None:
                    self._dimension = len(embedding)

                return embedding

        except httpx.ConnectError:
            raise RuntimeError(
                f"Could not connect to local Ollama at {self.base_url}. "
                "Ensure the Ollama service is running on your machine."
            )
        except Exception as e:
            logger.error(f"Ollama embedding generation failed for model '{self._model_name}': {e}")
            raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate dense embedding vectors for a list of text chunks sequentially or concurrently.
        """
        if not texts:
            return []

        embeddings = []
        for text in texts:
            emb = await self.embed_text(text)
            embeddings.append(emb)

        return embeddings

    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "provider": "ollama",
            "model": self._model_name,
            "dimension": self.dimension,
            "base_url": self.base_url,
            "sovereign_mode": True,
        }
