import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from app.config import Settings, get_settings
from app.models.schemas import (
    ApprovalDecisionRequest,
    ApprovalDecisionResponse,
    ChatRequest,
    ChatResponse,
    CodingWorkflowExecution,
    CodingWorkflowRequest,
    DocumentAnalysisRequest,
    DocumentAnalysisResponse,
    DocumentExtractionResponse,
    DocumentResponse,
    HealthResponse,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeIngestRequest,
    KnowledgeIngestResponse,
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
    KnowledgeStatsResponse,
    ModelHealthResponse,
    ModelRouteRequest,
    ModelRouteResponse,
    RAGAuditRequest,
    RAGAuditResponse,
    SandboxStatusResponse,
    WorkflowExecuteRequest,
    WorkflowExecution,
    AuditEvent,
    AuditLedgerResponse,
    LedgerIntegrityResponse,
    SovereigntyStatusResponse,
    EgressProbeResult,
)
from app.services.audit_logger import AuditLogger, audit_logger
from app.services.coding_agent import CodingAgent, get_coding_agent
from app.services.document_service import DocumentService, get_document_service
from app.services.knowledge_service import KnowledgeService, get_knowledge_service
from app.services.model_service import ModelService, get_model_service
from app.services.retrieval_service import RetrievalService, get_retrieval_service
from app.services.router_service import ModelRouterService, get_router_service
from app.services.sandbox_service import SandboxService, get_sandbox_service
from app.services.sovereignty_service import SovereigntyService, sovereignty_service
from app.services.workflow_engine import WorkflowEngine, get_workflow_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Sovereign AI"])


@router.get("/health", response_model=HealthResponse)
async def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Backend system health check."""
    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version="0.1.0",
        sovereign_mode=True,
    )


@router.get("/models/health", response_model=ModelHealthResponse)
async def get_models_health(
    model_service: ModelService = Depends(get_model_service),
) -> ModelHealthResponse:
    """Check Ollama connectivity and whether the designated development model is available."""
    try:
        return await model_service.check_health()
    except Exception as e:
        logger.exception("Error checking model health")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model service health check failed: {str(e)}",
        )


@router.get("/models")
async def list_models(
    model_service: ModelService = Depends(get_model_service),
) -> Dict[str, Any]:
    """List all installed local models."""
    try:
        models = await model_service.list_available_models()
        return {"models": models, "count": len(models)}
    except Exception as e:
        logger.exception("Error listing models")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list local models: {str(e)}",
        )


@router.post("/models/default")
async def set_default_model(
    payload: Dict[str, Any],
    model_service: ModelService = Depends(get_model_service),
) -> Dict[str, Any]:
    """Set the system-wide default model for all workflows and chat."""
    model_name = payload.get("model") or payload.get("default_model")
    if not model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'model' field in request body",
        )
    model_service.set_default_model(model_name)
    health = await model_service.check_health()
    return {
        "status": "ok",
        "default_model": model_name,
        "is_model_available": health.is_model_available,
        "available_models": health.available_models,
    }


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    model_service: ModelService = Depends(get_model_service),
) -> ChatResponse:
    """Execute a prompt against the local Ollama LLM."""
    try:
        response = await model_service.generate_chat(request)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        logger.exception("Unexpected error during chat completion")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat generation encountered an error: {str(e)}",
        )


# ─── Document Endpoints (Milestone 2) ───

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    """Upload and securely register a PDF or image document."""
    return await doc_service.save_uploaded_file(file)


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    doc_service: DocumentService = Depends(get_document_service),
) -> List[DocumentResponse]:
    """List all ingested documents."""
    return doc_service.list_documents()


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentResponse:
    """Get metadata for a specific document."""
    return doc_service.get_document(document_id)


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
):
    """Delete an ingested document and its underlying storage."""
    doc_service.delete_document(document_id)
    return {"status": "deleted", "document_id": document_id}


@router.post("/documents/{document_id}/extract", response_model=DocumentExtractionResponse)
async def extract_document_text(
    document_id: str,
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentExtractionResponse:
    """Extract text from a document using PyMuPDF (for PDFs) or local Vision (for Images)."""
    return await doc_service.extract_text(document_id)


@router.post("/documents/{document_id}/analyze", response_model=DocumentAnalysisResponse)
async def analyze_document(
    document_id: str,
    request: DocumentAnalysisRequest = DocumentAnalysisRequest(),
    doc_service: DocumentService = Depends(get_document_service),
) -> DocumentAnalysisResponse:
    """Run local AI analysis on a document."""
    return await doc_service.analyze_document(document_id, request)


@router.post("/documents/{document_id}/rag-audit", response_model=RAGAuditResponse)
async def rag_audit_document(
    document_id: str,
    request: RAGAuditRequest = RAGAuditRequest(),
    doc_service: DocumentService = Depends(get_document_service),
) -> RAGAuditResponse:
    """Run RAG-grounded document audit cross-referencing organizational standards and SOPs."""
    return await doc_service.rag_audit_document(document_id, request)


# ─── Knowledge Base & Vector Store Endpoints (Milestone 3) ───

_global_knowledge_service = None
_global_retrieval_service = None


def get_knowledge_service(settings: Settings = Depends(get_settings)) -> KnowledgeService:
    global _global_knowledge_service
    if _global_knowledge_service is None:
        from app.services.embedding import get_embedding_provider
        from app.services.vector_store import get_vector_store
        
        embedding_provider = get_embedding_provider(settings)
        vector_store = get_vector_store(settings)
        _global_knowledge_service = KnowledgeService(
            vector_store=vector_store,
            embedding_provider=embedding_provider,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )
    return _global_knowledge_service


def get_retrieval_service(settings: Settings = Depends(get_settings)):
    global _global_retrieval_service
    if _global_retrieval_service is None:
        from app.services.embedding import get_embedding_provider
        from app.services.vector_store import get_vector_store
        from app.services.retrieval_service import RetrievalService

        embedding_provider = get_embedding_provider(settings)
        vector_store = get_vector_store(settings)
        _global_retrieval_service = RetrievalService(
            embedding_provider=embedding_provider,
            vector_store=vector_store,
        )
    return _global_retrieval_service


@router.post("/knowledge/ingest", response_model=KnowledgeIngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_knowledge(
    request: KnowledgeIngestRequest,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
    doc_service: DocumentService = Depends(get_document_service),
) -> KnowledgeIngestResponse:
    """Ingest a registered document or direct standard text into the persistent ChromaDB vector store."""
    if request.document_id:
        doc = doc_service.get_document(request.document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{request.document_id}' not found in registry."
            )
        
        # Ensure document text is extracted
        raw_doc = doc_service._registry.get(request.document_id, {})
        extracted_text = raw_doc.get("extracted_text")
        if not extracted_text:
            extracted_res = await doc_service.extract_text(request.document_id)
            extracted_text = extracted_res.extracted_text

        from app.models.schemas import DocumentRecord
        doc_record = DocumentRecord(
            document_id=doc.id,
            original_filename=doc.filename,
            file_type=doc.file_type,
            file_size_bytes=doc.size_bytes,
            storage_path=raw_doc.get("storage_path", ""),
            upload_timestamp=raw_doc.get("created_at"),
            extracted_text=extracted_text,
        )

        return await kb_service.ingest_extracted_document(
            doc_record=doc_record,
            extracted_text=extracted_text,
        )
    elif request.content and request.title:
        return await kb_service.ingest_text(
            title=request.title,
            content=request.content,
            metadata=request.metadata or {"source": "direct_text_entry"},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either 'document_id' or both 'title' and 'content'."
        )


@router.get("/knowledge/documents", response_model=List[KnowledgeDocument])
async def list_knowledge_documents(
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> List[KnowledgeDocument]:
    """List all organizational documents and standards indexed in ChromaDB."""
    return await kb_service.get_all_documents()


@router.get("/knowledge/documents/{document_id}", response_model=KnowledgeDocument)
async def get_knowledge_document(
    document_id: str,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeDocument:
    """Get metadata for a specific indexed document."""
    docs = await kb_service.get_all_documents()
    for d in docs:
        if d.id == document_id:
            return d
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Knowledge document with ID '{document_id}' not found in ChromaDB."
    )


@router.get("/knowledge/documents/{document_id}/chunks", response_model=List[KnowledgeChunk])
async def get_knowledge_document_chunks(
    document_id: str,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> List[KnowledgeChunk]:
    """Inspect all chunks for a specific indexed document from ChromaDB."""
    chunks = await kb_service.get_document_chunks(document_id)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No chunks found for document ID '{document_id}' in ChromaDB."
        )
    return chunks


@router.delete("/knowledge/documents/{document_id}")
async def delete_knowledge_document(
    document_id: str,
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> Dict[str, Any]:
    """Delete a document and all associated embeddings from ChromaDB."""
    deleted = await kb_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge document '{document_id}' not found in ChromaDB."
        )
    return {"status": "deleted", "document_id": document_id}


@router.post("/knowledge/query", response_model=KnowledgeQueryResponse)
async def query_knowledge(
    request: KnowledgeQueryRequest,
    retrieval_service = Depends(get_retrieval_service),
) -> KnowledgeQueryResponse:
    """Execute natural language semantic search across indexed standards in ChromaDB."""
    return await retrieval_service.search(
        query=request.query,
        top_k=request.top_k,
        filter_document_id=request.filter_document_id,
    )


@router.get("/knowledge/stats", response_model=KnowledgeStatsResponse)
async def get_knowledge_stats(
    kb_service: KnowledgeService = Depends(get_knowledge_service),
) -> KnowledgeStatsResponse:
    """Get ChromaDB vector store statistics, total chunks, and active embedding model info."""
    return kb_service.get_stats()


# ─── Multi-Model Router Endpoints (Milestone 4) ───

@router.post("/router/route", response_model=ModelRouteResponse)
async def route_task(
    request: ModelRouteRequest,
    router_service: ModelRouterService = Depends(get_router_service),
) -> ModelRouteResponse:
    """Evaluate task requirements and determine the optimal local open-weight model."""
    return await router_service.route_task(request)


# ─── Agentic Workflow & HITL Endpoints (Milestone 4) ───

@router.post("/workflows/execute", response_model=WorkflowExecution, status_code=status.HTTP_201_CREATED)
async def execute_hero_workflow(
    request: WorkflowExecuteRequest,
    workflow_engine: WorkflowEngine = Depends(get_workflow_engine),
) -> WorkflowExecution:
    """
    Trigger the autonomous Hero Workflow for an uploaded document.
    Executes extraction, ChromaDB SOP retrieval, and RAG compliance audit, then pauses at the HITL Checkpoint.
    """
    try:
        return await workflow_engine.start_hero_execution(
            document_id=request.document_id,
            custom_prompt=request.custom_prompt,
            sop_document_ids=request.sop_document_ids,
            reviewer_name=request.reviewer_name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to trigger workflow execution: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow execution initialization failed: {str(e)}",
        )


@router.get("/workflows/executions", response_model=List[WorkflowExecution])
async def list_workflow_executions(
    workflow_engine: WorkflowEngine = Depends(get_workflow_engine),
) -> List[WorkflowExecution]:
    """List all workflow execution sessions and their live statuses."""
    return workflow_engine.list_executions()


@router.get("/workflows/executions/{execution_id}", response_model=WorkflowExecution)
async def get_workflow_execution(
    execution_id: str,
    workflow_engine: WorkflowEngine = Depends(get_workflow_engine),
) -> WorkflowExecution:
    """Get the real-time execution graph, step statuses, and findings for a specific session."""
    execution = workflow_engine.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow execution session '{execution_id}' not found.",
        )
    return execution


@router.post("/workflows/executions/{execution_id}/cancel", response_model=WorkflowExecution)
async def cancel_workflow_execution(
    execution_id: str,
    workflow_engine: WorkflowEngine = Depends(get_workflow_engine),
) -> WorkflowExecution:
    """Cancel an in-flight workflow execution session immediately."""
    execution = workflow_engine.cancel_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow execution session '{execution_id}' not found.",
        )
    return execution


@router.post("/workflows/executions/{execution_id}/approve", response_model=ApprovalDecisionResponse)
async def submit_workflow_approval(
    execution_id: str,
    request: ApprovalDecisionRequest,
    workflow_engine: WorkflowEngine = Depends(get_workflow_engine),
) -> ApprovalDecisionResponse:
    """
    Human-in-the-Loop (HITL) Checkpoint decision submission.
    Approves or rejects the compliance audit and triggers DOCX approval note generation upon approval.
    """
    try:
        return await workflow_engine.submit_human_decision(execution_id, request)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Approval submission failed for {execution_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Approval submission failed: {str(e)}",
        )


@router.get("/workflows/executions/{execution_id}/artifact")
async def download_workflow_artifact(
    execution_id: str,
    workflow_engine: WorkflowEngine = Depends(get_workflow_engine),
):
    """Download the generated DOCX compliance approval note artifact."""
    execution = workflow_engine.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow execution '{execution_id}' not found.",
        )

    if not execution.artifact_path or not os.path.exists(execution.artifact_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact for execution '{execution_id}' has not been generated or approved yet.",
        )

    return FileResponse(
        path=execution.artifact_path,
        filename=execution.artifact_filename or f"Approval_Note_{execution_id[:8]}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# ─── Phase 5: Coding Agent & Sandboxed Tool Execution Routes (Workflow B) ───

@router.post("/coding/execute", response_model=CodingWorkflowExecution, status_code=status.HTTP_202_ACCEPTED)
async def execute_coding_workflow(
    request: CodingWorkflowRequest,
    coding_agent: CodingAgent = Depends(get_coding_agent),
) -> CodingWorkflowExecution:
    """
    Launch Autonomous Coding Workflow B:
    1. Spec analysis
    2. Code & test synthesis
    3. AST air-gap security validation
    4. Sandboxed test execution
    5. Automated 3-iteration self-repair loop
    6. Verified Python artifact packaging
    """
    try:
        return await coding_agent.start_coding_workflow(request)
    except Exception as e:
        logger.error(f"Failed to initiate coding workflow: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate coding workflow: {str(e)}",
        )


@router.get("/coding/executions", response_model=List[CodingWorkflowExecution])
async def list_coding_executions(
    coding_agent: CodingAgent = Depends(get_coding_agent),
) -> List[CodingWorkflowExecution]:
    """List all coding workflow executions."""
    return coding_agent.list_executions()


@router.get("/coding/executions/{execution_id}", response_model=CodingWorkflowExecution)
async def get_coding_execution(
    execution_id: str,
    coding_agent: CodingAgent = Depends(get_coding_agent),
) -> CodingWorkflowExecution:
    """Get the live status, test results, code snapshots, and repair timeline for a coding execution."""
    execution = coding_agent.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding execution session '{execution_id}' not found.",
        )
    return execution


@router.post("/coding/executions/{execution_id}/cancel", response_model=CodingWorkflowExecution)
async def cancel_coding_execution(
    execution_id: str,
    coding_agent: CodingAgent = Depends(get_coding_agent),
) -> CodingWorkflowExecution:
    """Cancel an in-flight coding workflow execution."""
    cancelled = coding_agent.cancel_execution(execution_id)
    execution = coding_agent.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding execution session '{execution_id}' not found.",
        )
    return execution


@router.get("/coding/executions/{execution_id}/artifact")
async def download_coding_artifact(
    execution_id: str,
    coding_agent: CodingAgent = Depends(get_coding_agent),
):
    """Download the verified Python script artifact generated by Workflow B."""
    execution = coding_agent.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding execution session '{execution_id}' not found.",
        )

    if not execution.artifact_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact has not been generated or verified yet.",
        )

    from app.config import settings
    artifact_path = Path(settings.ARTIFACTS_DIR) / execution.artifact_filename
    if not artifact_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact file '{execution.artifact_filename}' not found on disk.",
        )

    return FileResponse(
        path=str(artifact_path),
        filename=execution.artifact_filename,
        media_type="text/x-python",
    )


@router.get("/coding/sandbox/status", response_model=SandboxStatusResponse)
async def get_sandbox_status(
    sandbox_service: SandboxService = Depends(get_sandbox_service),
) -> SandboxStatusResponse:
    """Get the current health and mode of the sandboxed tool execution environment."""
    docker_ok = sandbox_service.check_docker_available()
    return SandboxStatusResponse(
        docker_available=docker_ok,
        active_engine="docker_isolated" if docker_ok else "subprocess_isolated",
        security_guard_enforced=True,
        timeout_limit_seconds=5.0,
        memory_limit_mb=128,
    )


# ─── Phase 6: Sovereignty & Cryptographic Audit Ledger Endpoints ───

@router.get("/sovereignty/status", response_model=SovereigntyStatusResponse)
async def get_sovereignty_status() -> SovereigntyStatusResponse:
    """Get current air-gap compliance scorecard, network score, and egress status."""
    return sovereignty_service.get_sovereignty_status(run_live_probe=False)


@router.post("/sovereignty/probe", response_model=SovereigntyStatusResponse)
async def probe_sovereignty_status() -> SovereigntyStatusResponse:
    """Trigger live network egress probes against external targets and return fresh scorecard."""
    return sovereignty_service.get_sovereignty_status(run_live_probe=True)


@router.get("/audit/ledger", response_model=AuditLedgerResponse)
async def get_audit_ledger(
    limit: int = 100,
    event_type: Optional[str] = None,
) -> AuditLedgerResponse:
    """Retrieve immutable cryptographic audit ledger events with optional event_type filtering."""
    events = audit_logger.get_ledger(limit=limit, event_type=event_type, reverse=True)
    integrity = audit_logger.verify_integrity()
    return AuditLedgerResponse(
        total_events=len(events),
        chain_valid=integrity.is_valid,
        events=events,
    )


@router.get("/audit/verify", response_model=LedgerIntegrityResponse)
async def verify_audit_integrity() -> LedgerIntegrityResponse:
    """Verify cryptographic SHA-256 hash-chain across all recorded audit blocks."""
    return audit_logger.verify_integrity()


@router.get("/audit/export")
async def export_audit_ledger(format: str = "csv"):
    """Export the immutable audit trail as CSV or JSONL for defense / regulatory audits."""
    from fastapi.responses import PlainTextResponse

    if format.lower() == "csv":
        csv_content = audit_logger.export_ledger_csv()
        return PlainTextResponse(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sovereign_audit_ledger.csv"}
        )
    else:
        # JSONL format
        events = audit_logger.get_ledger(limit=10000, reverse=False)
        import json
        jsonl_content = "\n".join(json.dumps(ev.model_dump()) for ev in events)
        return PlainTextResponse(
            content=jsonl_content,
            media_type="application/x-ndjson",
            headers={"Content-Disposition": "attachment; filename=sovereign_audit_ledger.jsonl"}
        )


@router.post("/demo/seed")
async def seed_demo():
    """Trigger one-click industrial demo package seeding for live hackathon presentations."""
    try:
        import sys
        from pathlib import Path
        repo_root = str(Path(__file__).resolve().parent.parent.parent.parent)
        if repo_root not in sys.path:
            sys.path.insert(0, repo_root)
        from scripts.seed_demo_package import seed_demo_package
        res = await seed_demo_package()
        return res
    except Exception as e:
        logger.error(f"Failed to seed demo package: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo package seeding failed: {str(e)}"
        )




