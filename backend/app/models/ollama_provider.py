import json
import logging
import time
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx

from app.models.base import ModelProvider
from app.models.schemas import ChatMessage, ChatResponse, ModelHealthResponse

logger = logging.getLogger(__name__)


class OllamaProvider(ModelProvider):
    """Local Ollama provider implementation.
    
    Communicates strictly with the local Ollama daemon (e.g. http://localhost:11434)
    without any outbound internet/cloud requests.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        default_model: str = "qwen2.5-coder:1.5b",
        timeout_seconds: float = 60.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout_seconds

    def _get_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout, connect=10.0),
        )

    async def generate(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> ChatResponse:
        target_model = model or self.default_model
        formatted_messages = []
        for m in messages:
            msg_dict: Dict[str, Any] = {"role": m.role, "content": m.content}
            if getattr(m, "images", None):
                msg_dict["images"] = m.images
            formatted_messages.append(msg_dict)

        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": formatted_messages,
            "stream": False,
            "think": False,
            "options": {
                "temperature": temperature,
            },
        }
        if max_tokens is not None:
            payload["options"]["num_predict"] = max_tokens

        start_time = time.perf_counter()

        try:
            async with self._get_client() as client:
                response = await client.post("/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.ConnectError as e:
            logger.error(f"Cannot connect to Ollama at {self.base_url}: {e}")
            raise RuntimeError(
                f"Local Ollama server is unreachable at {self.base_url}. Ensure Ollama service is running."
            ) from e
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama returned HTTP error {e.response.status_code}: {e.response.text}")
            raise RuntimeError(
                f"Ollama error ({e.response.status_code}): {e.response.text}"
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error communicating with Ollama: {e}")
            raise RuntimeError(f"Ollama generation failed: {str(e)}") from e

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        message_content = data.get("message", {}).get("content", "")
        # Ollama total_duration is in nanoseconds if present
        ollama_total_ns = data.get("total_duration")
        if ollama_total_ns:
            duration_ms = ollama_total_ns / 1_000_000.0

        return ChatResponse(
            response=message_content,
            model=data.get("model", target_model),
            provider="ollama",
            total_duration_ms=round(duration_ms, 2),
            prompt_eval_count=data.get("prompt_eval_count"),
            eval_count=data.get("eval_count"),
            created_at=data.get("created_at"),
        )

    async def stream(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        target_model = model or self.default_model
        formatted_messages = []
        for m in messages:
            msg_dict: Dict[str, Any] = {"role": m.role, "content": m.content}
            if getattr(m, "images", None):
                msg_dict["images"] = m.images
            formatted_messages.append(msg_dict)

        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": formatted_messages,
            "stream": True,
            "think": False,
            "options": {
                "temperature": temperature,
            },
        }
        if max_tokens is not None:
            payload["options"]["num_predict"] = max_tokens

        try:
            async with self._get_client() as client:
                async with client.stream("POST", "/api/chat", json=payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        chunk_data = json.loads(line)
                        content = chunk_data.get("message", {}).get("content", "")
                        if content:
                            yield content
        except Exception as e:
            logger.error(f"Streaming error from Ollama: {e}")
            raise RuntimeError(f"Streaming failed: {str(e)}") from e

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            async with self._get_client() as client:
                response = await client.get("/api/tags")
                response.raise_for_status()
                data = response.json()
                return data.get("models", [])
        except Exception as e:
            logger.warning(f"Failed to list models from Ollama at {self.base_url}: {e}")
            return []

    async def health(self) -> ModelHealthResponse:
        try:
            models = await self.list_models()
            model_names = [m.get("name", "") for m in models]
            # Match exact name or without tag
            is_available = any(
                m == self.default_model or m.startswith(f"{self.default_model}:") or self.default_model.startswith(m)
                for m in model_names
            )

            status = "ok" if is_available else "warning"
            error = None if is_available else f"Default model '{self.default_model}' is not in local Ollama repository."

            return ModelHealthResponse(
                status=status,
                provider="ollama",
                base_url=self.base_url,
                default_model=self.default_model,
                is_model_available=is_available,
                available_models=model_names,
                error=error,
            )
        except Exception as e:
            return ModelHealthResponse(
                status="error",
                provider="ollama",
                base_url=self.base_url,
                default_model=self.default_model,
                is_model_available=False,
                available_models=[],
                error=f"Cannot reach Ollama: {str(e)}",
            )

    async def pull_model(self, model_name: str) -> Dict[str, Any]:
        """Request local Ollama daemon to download/pull a model."""
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=httpx.Timeout(600.0, connect=10.0)) as client:
                response = await client.post("/api/pull", json={"name": model_name, "stream": False})
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to pull model '{model_name}' via Ollama: {e}")
            raise RuntimeError(f"Ollama model download failed for '{model_name}': {str(e)}") from e

