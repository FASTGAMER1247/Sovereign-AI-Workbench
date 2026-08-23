from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List, Optional
from app.models.schemas import ChatMessage, ChatResponse, ModelHealthResponse


class ModelProvider(ABC):
    """Abstract Base Class for all local model providers.
    
    This ensures application services and future agents interact with models
    through a standardized capability interface rather than direct API calls.
    """

    @abstractmethod
    async def generate(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> ChatResponse:
        """Generate a complete chat completion response."""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens chunk by chunk."""
        pass

    @abstractmethod
    async def health(self) -> ModelHealthResponse:
        """Check provider connectivity and model availability."""
        pass

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """List all models currently installed in the provider."""
        pass
