import logging
import re
from typing import Any, Dict, List, Optional

from app.config import settings
from app.models.schemas import ModelRouteRequest, ModelRouteResponse
from app.services.model_service import ModelService, get_model_service

logger = logging.getLogger("app.services.router_service")


class ModelRouterService:
    """
    Intelligent Model Router for Sovereign AI Workbench.
    Dynamically routes incoming tasks to the most suitable local open-weight model
    based on task type, input modalities (text/vision), and capability constraints.
    """

    # Static capability database for known local open-weight models
    KNOWN_MODEL_CAPABILITIES: Dict[str, List[str]] = {
        "qwen3.5:0.8b": ["chat", "reasoning", "vision", "coding", "rag_audit"],
        "qwen2.5:0.5b": ["chat", "coding", "rag_audit"],
        "qwen2.5:1.5b": ["chat", "coding", "rag_audit"],
        "qwen2.5:3b": ["chat", "reasoning", "coding", "rag_audit"],
        "qwen2.5-coder": ["coding", "reasoning"],
        "llama3.2:1b": ["chat", "rag_audit"],
        "llama3.2:3b": ["chat", "reasoning", "rag_audit"],
        "llama3.2-vision": ["vision", "chat"],
        "llava": ["vision", "chat"],
        "nomic-embed-text": ["embeddings", "vector"],
        "all-minilm": ["embeddings", "vector"],
    }

    def __init__(self, model_service: Optional[ModelService] = None):
        self.model_service = model_service or get_model_service()

    async def get_available_models(self) -> List[str]:
        """Fetch all locally installed models from Ollama."""
        try:
            health = await self.model_service.check_health()
            return health.available_models
        except Exception as e:
            logger.warning(f"Failed to fetch model list from Ollama: {e}")
            return [settings.DEFAULT_MODEL]

    def infer_task_type(self, prompt: Optional[str], has_images: bool = False) -> str:
        """Heuristically determine the task type from input characteristics."""
        if has_images:
            return "vision"

        if not prompt or not prompt.strip():
            return "chat"

        p_lower = prompt.lower()

        # Check for Coding keywords
        code_patterns = [
            r"\b(def|class|function|import|const|let|var|return|async|await)\b",
            r"\b(python|javascript|typescript|c\+\+|rust|html|css|sql|bash|powershell)\b",
            r"\b(write a script|debug|refactor|compile|algorithm|api endpoint)\b",
        ]
        for pattern in code_patterns:
            if re.search(pattern, p_lower):
                return "coding"

        # Check for RAG / Compliance Audit keywords
        audit_patterns = [
            r"\b(sop|standard|compliance|audit|inspection|asme|api 570|iso|astm)\b",
            r"\b(wall thickness|corrosion|defect|tolerance|retirement limit|ndt)\b",
            r"\b(risk assessment|remediation|non-compliant|corrective action)\b",
        ]
        for pattern in audit_patterns:
            if re.search(pattern, p_lower):
                return "rag_audit"

        # Check for Deep Reasoning keywords
        reasoning_patterns = [
            r"\b(calculate|derive|prove|step-by-step|analyze systematically|root cause)\b",
            r"\b(why did|mathematical|formula|evaluate tradeoffs)\b",
        ]
        for pattern in reasoning_patterns:
            if re.search(pattern, p_lower):
                return "reasoning"

        return "chat"

    def get_capabilities_for_model(self, model_name: str) -> List[str]:
        """Return capabilities for a specific model name."""
        clean_name = model_name.split(":")[0].lower()
        # Direct lookup
        for key, caps in self.KNOWN_MODEL_CAPABILITIES.items():
            if key.split(":")[0].lower() == clean_name:
                return caps
        # Default capabilities
        return ["chat", "rag_audit"]

    async def route_task(self, request: ModelRouteRequest) -> ModelRouteResponse:
        """
        Evaluate task requirements and determine the optimal local model.
        """
        available_models = await self.get_available_models()
        default_model = settings.DEFAULT_MODEL

        # Determine task type
        task_type = request.task_type
        if not task_type:
            task_type = self.infer_task_type(request.prompt, request.has_images)

        # Check user preferred override
        if request.preferred_model:
            preferred = request.preferred_model.strip()
            # If preferred is available, use it directly
            if any(preferred.lower() in m.lower() for m in available_models):
                matching = next(m for m in available_models if preferred.lower() in m.lower())
                return ModelRouteResponse(
                    task_type=task_type,
                    selected_model=matching,
                    provider="ollama",
                    capabilities=self.get_capabilities_for_model(matching),
                    reason=f"User requested override '{preferred}' is available locally.",
                    fallback_model=default_model if matching != default_model else None,
                )

        # Determine required capability
        required_cap = "chat"
        if task_type == "vision" or request.has_images:
            required_cap = "vision"
        elif task_type == "embeddings":
            required_cap = "embeddings"
        elif task_type == "coding":
            required_cap = "coding"
        elif task_type == "reasoning":
            required_cap = "reasoning"
        elif task_type == "rag_audit":
            required_cap = "rag_audit"

        # If embeddings requested
        if required_cap == "embeddings":
            embedding_model = settings.EMBEDDING_MODEL
            if any(embedding_model in m for m in available_models):
                selected = next(m for m in available_models if embedding_model in m)
                return ModelRouteResponse(
                    task_type="embeddings",
                    selected_model=selected,
                    provider="ollama",
                    capabilities=["embeddings", "vector"],
                    reason=f"Selected local dense embedding model '{selected}' (768-dim).",
                    fallback_model="all-MiniLM-L6-v2",
                )

        # Find models matching the required capability
        suitable_models = []
        for model in available_models:
            # Don't pick pure embedding models for generative tasks
            if "embed" in model.lower():
                continue
            caps = self.get_capabilities_for_model(model)
            if required_cap in caps or "chat" in caps:
                suitable_models.append((model, caps))

        if not suitable_models:
            # Fallback to default
            selected_model = default_model
            reason = f"No specialized model found for '{required_cap}'. Falling back to default model '{default_model}'."
        else:
            # Prefer models with exact required capability
            exact_matches = [m for m, caps in suitable_models if required_cap in caps]
            if exact_matches:
                # Prefer default model if it matches
                if any(default_model in m for m in exact_matches):
                    selected_model = next(m for m in exact_matches if default_model in m)
                else:
                    selected_model = exact_matches[0]
                reason = f"Routed to '{selected_model}' matching capability '{required_cap}' for task '{task_type}'."
            else:
                selected_model = suitable_models[0][0]
                reason = f"Routed to general chat model '{selected_model}' for task '{task_type}'."

        caps = self.get_capabilities_for_model(selected_model)
        fallback = default_model if selected_model != default_model else None

        logger.info(f"Model Router Decision: task={task_type} -> model={selected_model} (reason: {reason})")

        return ModelRouteResponse(
            task_type=task_type,
            selected_model=selected_model,
            provider="ollama",
            capabilities=caps,
            reason=reason,
            fallback_model=fallback,
        )


# Singleton instance
_router_instance: Optional[ModelRouterService] = None


def get_router_service() -> ModelRouterService:
    global _router_instance
    if _router_instance is None:
        _router_instance = ModelRouterService()
    return _router_instance
