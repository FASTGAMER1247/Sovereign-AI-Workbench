from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Text content of the message")
    images: Optional[List[str]] = Field(None, description="Optional list of base64-encoded image strings for multimodal vision models")


class ChatRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Direct prompt string (shorthand for single user message)")
    messages: Optional[List[ChatMessage]] = Field(None, description="Structured chat messages list")
    model: Optional[str] = Field(None, description="Target model name; defaults to configured default model")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, description="Maximum tokens to generate")

    def get_effective_messages(self) -> List[ChatMessage]:
        """Convert prompt or messages into a normalized list of ChatMessage."""
        if self.messages and len(self.messages) > 0:
            return self.messages
        if self.prompt:
            return [ChatMessage(role="user", content=self.prompt)]
        raise ValueError("Either 'prompt' or 'messages' must be provided.")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Generated text response from the model")
    model: str = Field(..., description="Model name that generated the response")
    provider: str = Field("ollama", description="Provider used (e.g. 'ollama')")
    total_duration_ms: Optional[float] = Field(None, description="Total generation duration in milliseconds")
    prompt_eval_count: Optional[int] = Field(None, description="Prompt tokens evaluated")
    eval_count: Optional[int] = Field(None, description="Completion tokens generated")
    created_at: Optional[str] = Field(None, description="ISO timestamp")


class HealthResponse(BaseModel):
    status: str = Field("ok", description="Status string: 'ok' or 'degraded'")
    app: str = Field(..., description="Application name")
    version: str = Field("0.1.0", description="API version")
    sovereign_mode: bool = Field(True, description="True indicates air-gapped / local execution only")


class ModelDetail(BaseModel):
    name: str
    parameter_size: Optional[str] = None
    quantization_level: Optional[str] = None
    capabilities: List[str] = []


class ModelHealthResponse(BaseModel):
    status: str = Field(..., description="'ok', 'warning', or 'error'")
    provider: str = Field(..., description="Model provider name")
    base_url: str = Field(..., description="Endpoint URL of the model server")
    default_model: str = Field(..., description="Default model name configured")
    is_model_available: bool = Field(..., description="Whether default model is loaded in Ollama")
    available_models: List[str] = Field(default_factory=list, description="All installed local models")
    error: Optional[str] = Field(None, description="Error detail if unavailable")


# ─── Document Schemas (Milestone 2) ───

class DocumentResponse(BaseModel):
    id: str = Field(..., description="Unique generated document ID")
    filename: str = Field(..., description="Original sanitized filename")
    file_type: str = Field(..., description="Detected file extension: pdf, png, jpg, jpeg")
    size_bytes: int = Field(..., description="File size in bytes")
    created_at: str = Field(..., description="ISO 8601 upload timestamp")
    status: str = Field("uploaded", description="Status: 'uploaded', 'extracted', 'analyzed', 'error'")
    extracted_text_preview: Optional[str] = Field(None, description="Short snippet of extracted text if available")
    error_message: Optional[str] = Field(None, description="Error details if processing failed")


class DocumentExtractionResponse(BaseModel):
    document_id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File type")
    extracted_text: str = Field(..., description="Full extracted text or vision description")
    char_count: int = Field(..., description="Number of extracted characters")
    method: str = Field(..., description="Extraction method: 'pymupdf' or 'ollama_vision'")


class DocumentAnalysisRequest(BaseModel):
    prompt: Optional[str] = Field(
        None,
        description="Custom prompt or question for document analysis (defaults to standard summary/findings analysis)"
    )
    model: Optional[str] = Field(None, description="Optional override model name")


class DocumentAnalysisResponse(BaseModel):
    document_id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Original filename")
    analysis: str = Field(..., description="AI-generated document analysis")
    model: str = Field(..., description="Model used for analysis")
    provider: str = Field("ollama", description="Provider used")
    duration_ms: Optional[float] = Field(None, description="Duration of analysis in ms")
    prompt_tokens: Optional[int] = Field(None, description="Prompt token count")
    completion_tokens: Optional[int] = Field(None, description="Completion token count")
    created_at: str = Field(..., description="ISO timestamp")

