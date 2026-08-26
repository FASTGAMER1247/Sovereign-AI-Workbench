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


class DocumentRecord(BaseModel):
    document_id: str = Field(..., description="Document ID")
    original_filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File extension")
    file_size_bytes: int = Field(0, description="Size in bytes")
    storage_path: str = Field("", description="Local disk storage path")
    upload_timestamp: Optional[str] = Field(None, description="Upload timestamp")
    extracted_text: Optional[str] = Field(None, description="Extracted text")


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


# ─── Knowledge Base & RAG Schemas (Milestone 3) ───

class KnowledgeChunk(BaseModel):
    id: str = Field(..., description="Unique chunk ID")
    document_id: str = Field(..., description="Parent document ID")
    filename: str = Field(..., description="Source document filename")
    page_number: Optional[int] = Field(None, description="Source page number if available")
    chunk_index: int = Field(..., description="Zero-based index of this chunk within document")
    content: str = Field(..., description="Text content of the chunk")
    char_count: int = Field(..., description="Length in characters")


class KnowledgeDocument(BaseModel):
    id: str = Field(..., description="Unique document ID in knowledge base")
    filename: str = Field(..., description="Sanitized filename")
    file_type: str = Field(..., description="File extension")
    total_chunks: int = Field(..., description="Number of indexed chunks")
    indexed_at: str = Field(..., description="ISO timestamp of indexing")
    status: str = Field("indexed", description="Indexing status: 'indexed', 'processing', 'error'")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary metadata (e.g. standard type, department)")


class KnowledgeIngestRequest(BaseModel):
    document_id: Optional[str] = Field(None, description="ID of an existing uploaded document to index")
    title: Optional[str] = Field(None, description="Title or name for direct text ingestion")
    content: Optional[str] = Field(None, description="Direct raw text content if not referencing an uploaded document")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional metadata tags (e.g. SOP, ASME, Manual)")


class KnowledgeIngestResponse(BaseModel):
    document_id: str = Field(..., description="Indexed document ID")
    filename: str = Field(..., description="Filename or title")
    total_chunks: int = Field(..., description="Total chunks created and indexed")
    indexed_at: str = Field(..., description="ISO timestamp")
    message: str = Field(..., description="Human-readable result summary")


class KnowledgeQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language semantic search query")
    top_k: int = Field(4, ge=1, le=20, description="Maximum number of relevant chunks to retrieve")
    similarity_threshold: float = Field(0.0, ge=0.0, le=1.0, description="Minimum similarity threshold (0.0 to 1.0)")
    filter_document_id: Optional[str] = Field(None, description="Optional document ID to restrict search within")


class ScoredKnowledgeChunk(BaseModel):
    chunk: KnowledgeChunk = Field(..., description="The matched chunk data")
    similarity_score: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")


class KnowledgeQueryResponse(BaseModel):
    query: str = Field(..., description="Original search query")
    results: List[ScoredKnowledgeChunk] = Field(default_factory=list, description="Top-K matched chunks ranked by similarity")
    total_matched: int = Field(..., description="Number of results matching threshold")
    query_time_ms: float = Field(..., description="Search execution duration in milliseconds")


class KnowledgeStatsResponse(BaseModel):
    total_documents: int = Field(..., description="Total documents in knowledge base")
    total_chunks: int = Field(..., description="Total vectors indexed")
    embedding_engine: str = Field(..., description="Active embedding provider / engine")
    embedding_model: str = Field(..., description="Embedding model name")
    storage_path: str = Field(..., description="Local storage path")


class GroundedCitation(BaseModel):
    document_id: Optional[str] = Field(None, description="Source document ID")
    document_name: str = Field(..., description="Source SOP or manual filename")
    page_number: Optional[int] = Field(None, description="Page number if known")
    chunk_index: int = Field(..., description="Chunk index")
    similarity_score: float = Field(..., description="Similarity score")
    excerpt: str = Field(..., description="Excerpt from the standard/SOP")


class RAGAuditRequest(BaseModel):
    prompt: Optional[str] = Field(
        None,
        description="Optional custom audit prompt or questions regarding compliance"
    )
    model: Optional[str] = Field(None, description="Optional override model name")
    top_k_standards: int = Field(4, ge=1, le=10, description="Number of SOP/standard chunks to ground against")
    filter_kb_document_ids: Optional[List[str]] = Field(None, description="Optional list of specific KB document IDs to cross-reference")


class RAGAuditResponse(BaseModel):
    document_id: str = Field(..., description="Document ID under audit")
    filename: str = Field(..., description="Document filename")
    analysis: str = Field(..., description="AI audit findings grounded with local standards")
    grounded_citations: List[GroundedCitation] = Field(default_factory=list, description="Referenced standard excerpts and pages")
    model: str = Field(..., description="Model used for analysis")
    provider: str = Field("ollama", description="Model provider")
    duration_ms: Optional[float] = Field(None, description="Total audit duration in ms")
    prompt_tokens: Optional[int] = Field(None, description="Prompt token count")
    completion_tokens: Optional[int] = Field(None, description="Completion token count")
    created_at: str = Field(..., description="ISO timestamp")


# ─── Multi-Model Router Schemas (Milestone 4) ───

class ModelRouteRequest(BaseModel):
    task_type: Optional[str] = Field(None, description="Type of task: 'chat', 'reasoning', 'vision', 'coding', 'rag_audit', 'embeddings'")
    prompt: Optional[str] = Field(None, description="User prompt text to auto-classify if task_type not explicitly given")
    has_images: bool = Field(False, description="Whether the request contains images/visual data")
    required_capabilities: Optional[List[str]] = Field(None, description="Explicit list of capabilities required")
    preferred_model: Optional[str] = Field(None, description="User preferred model override")


class ModelRouteResponse(BaseModel):
    task_type: str = Field(..., description="Detected or requested task type")
    selected_model: str = Field(..., description="Optimal local model selected")
    provider: str = Field("ollama", description="Model provider")
    capabilities: List[str] = Field(default_factory=list, description="Capabilities supported by selected model")
    reason: str = Field(..., description="Human-readable routing rationale")
    fallback_model: Optional[str] = Field(None, description="Fallback model if primary fails")


# ─── Agentic Workflow & HITL Schemas (Milestone 4) ───

class WorkflowStep(BaseModel):
    id: str = Field(..., description="Step unique ID (e.g. 'step_extract')")
    name: str = Field(..., description="Step identifier")
    title: str = Field(..., description="Human-readable title")
    status: str = Field("pending", description="'pending', 'running', 'completed', 'failed', 'waiting_approval'")
    tool_name: Optional[str] = Field(None, description="Name of tool invoked")
    output_summary: Optional[str] = Field(None, description="Short summary of step output")
    output_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Structured step payload")
    error: Optional[str] = Field(None, description="Error detail if step failed")
    started_at: Optional[str] = Field(None, description="ISO timestamp")
    completed_at: Optional[str] = Field(None, description="ISO timestamp")


class WorkflowExecuteRequest(BaseModel):
    document_id: str = Field(..., description="Document ID to process through the hero workflow")
    custom_prompt: Optional[str] = Field(None, description="Optional custom compliance audit directive")
    sop_document_ids: Optional[List[str]] = Field(None, description="Optional specific SOP document IDs to cross-reference")
    reviewer_name: Optional[str] = Field("Chief Plant Engineer", description="Default reviewer name for approval note")


class WorkflowExecution(BaseModel):
    id: str = Field(..., description="Unique workflow execution ID")
    workflow_type: str = Field("industrial_hero_audit", description="Workflow graph identifier")
    status: str = Field("running", description="'running', 'waiting_for_approval', 'approved', 'rejected', 'completed', 'failed'")
    document_id: str = Field(..., description="Target document ID")
    document_name: str = Field(..., description="Target document filename")
    steps: List[WorkflowStep] = Field(default_factory=list, description="Ordered workflow execution steps")
    current_step_index: int = Field(0, description="Index of currently active step")
    extracted_text: Optional[str] = Field(None, description="Extracted document findings text")
    grounded_citations: List[GroundedCitation] = Field(default_factory=list, description="Citations retrieved from knowledge base")
    audit_analysis: Optional[str] = Field(None, description="Generated RAG compliance report")
    approval_status: Optional[str] = Field(None, description="'waiting', 'approved', 'rejected'")
    reviewer_name: Optional[str] = Field(None, description="Name of human approver")
    reviewer_notes: Optional[str] = Field(None, description="Human reviewer comments/modifications")
    edited_recommendations: Optional[str] = Field(None, description="Human modified corrective actions")
    artifact_filename: Optional[str] = Field(None, description="Generated DOCX filename")
    artifact_path: Optional[str] = Field(None, description="Local disk path to generated DOCX")
    artifact_url: Optional[str] = Field(None, description="API endpoint to download DOCX")
    duration_ms: Optional[float] = Field(None, description="Total execution duration in ms")
    error: Optional[str] = Field(None, description="Failure reason if any")
    created_at: str = Field(..., description="ISO creation timestamp")
    updated_at: str = Field(..., description="ISO last updated timestamp")


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., description="'approve' or 'reject'")
    reviewer_name: str = Field("Chief Plant Engineer", description="Full name and title of human approver")
    reviewer_notes: Optional[str] = Field(None, description="Operator sign-off remarks or rejection rationale")
    edited_recommendations: Optional[str] = Field(None, description="Optional override/edit of AI-suggested recommendations")


class ApprovalDecisionResponse(BaseModel):
    execution_id: str = Field(..., description="Workflow execution ID")
    decision: str = Field(..., description="'approved' or 'rejected'")
    status: str = Field(..., description="Updated workflow status")
    artifact_ready: bool = Field(False, description="Whether the DOCX approval note was generated")
    artifact_url: Optional[str] = Field(None, description="Direct download URL if ready")
    message: str = Field(..., description="Summary status message")


class ApprovalNoteContent(BaseModel):
    title: str = Field("SOVEREIGN INDUSTRIAL COMPLIANCE APPROVAL NOTE", description="Document Title")
    reference_id: str = Field(..., description="Approval note tracking ID")
    date: str = Field(..., description="Date of approval note")
    plant_area: str = Field("Area 4 - Fluid Catalytic Cracking Unit (FCCU)", description="Plant facility or unit")
    equipment_id: str = Field("Line 102 - Carbon Steel Spool A", description="Inspected equipment or tag")
    inspector_name: str = Field("Industrial NDT Inspection Team", description="Inspection author")
    approver_name: str = Field("Chief Plant Engineer", description="Signing authority")
    executive_summary: str = Field(..., description="High-level executive summary")
    inspection_findings: str = Field(..., description="Measured inspection parameters and defects")
    sop_evaluations: List[GroundedCitation] = Field(default_factory=list, description="Cross-referenced SOP clauses and citations")
    risk_severity: str = Field("CRITICAL", description="'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'")
    mandatory_actions: str = Field(..., description="Mandated maintenance or corrective actions")
    compliance_verdict: str = Field("NON-COMPLIANT - MANDATORY SPOOL REPLACEMENT", description="Final compliance determination")
    reviewer_notes: Optional[str] = Field(None, description="Human reviewer comments")


