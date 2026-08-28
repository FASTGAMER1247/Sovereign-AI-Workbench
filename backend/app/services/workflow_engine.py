import asyncio
import datetime
import json
import logging
import re
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import settings
from app.models.schemas import (
    ApprovalDecisionRequest,
    ApprovalDecisionResponse,
    ApprovalNoteContent,
    GroundedCitation,
    RAGAuditRequest,
    WorkflowExecution,
    WorkflowStep,
)
from app.services.document_service import DocumentService, get_document_service
from app.services.docx_service import DocxService, get_docx_service
from app.services.rag_service import RAGService, get_rag_service
from app.services.retrieval_service import RetrievalService, get_retrieval_service
from app.services.router_service import ModelRouterService, get_router_service

logger = logging.getLogger("app.services.workflow_engine")


class WorkflowEngine:
    """
    Agentic Workflow Engine for Sovereign AI Workbench.
    Executes multi-step industrial agent graphs with Human-in-the-Loop (HITL) checkpoints.
    """

    def __init__(
        self,
        document_service: Optional[DocumentService] = None,
        retrieval_service: Optional[RetrievalService] = None,
        rag_service: Optional[RAGService] = None,
        docx_service: Optional[DocxService] = None,
        router_service: Optional[ModelRouterService] = None,
    ):
        self.document_service = document_service or get_document_service()
        self.retrieval_service = retrieval_service or get_retrieval_service()
        self.rag_service = rag_service or get_rag_service()
        self.docx_service = docx_service or get_docx_service()
        self.router_service = router_service or get_router_service()

        self.storage_dir = Path(settings.DATA_DIR) / "workflows"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.executions_file = self.storage_dir / "executions.json"

        self._executions: Dict[str, WorkflowExecution] = {}
        self._running_tasks: Dict[str, asyncio.Task] = {}
        self._load_executions()

    def _load_executions(self):
        """Load execution state history from disk."""
        if self.executions_file.exists():
            try:
                with open(self.executions_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        exec_obj = WorkflowExecution(**item)
                        self._executions[exec_obj.id] = exec_obj
            except Exception as e:
                logger.error(f"Failed to load workflow executions from disk: {e}")

    def _save_executions(self):
        """Persist all executions to disk."""
        try:
            with open(self.executions_file, "w", encoding="utf-8") as f:
                json.dump([e.model_dump() for e in self._executions.values()], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist workflow executions: {e}")

    def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Fetch a specific execution by ID."""
        return self._executions.get(execution_id)

    def list_executions(self) -> List[WorkflowExecution]:
        """List all executions sorted by most recent first."""
        return sorted(list(self._executions.values()), key=lambda e: e.created_at, reverse=True)

    def _parse_audit_details(self, audit_text: Optional[str]) -> Dict[str, str]:
        """Parse structured compliance verdict, risk level, and recommendations dynamically from LLM audit text."""
        details = {
            "verdict": "NON-COMPLIANT",
            "severity": "HIGH",
            "recommendations": "Remediate identified non-conformances prior to release."
        }
        if not audit_text:
            return details

        upper_text = audit_text.upper()
        if "COMPLIANT" in upper_text and "NON-COMPLIANT" not in upper_text:
            details["verdict"] = "COMPLIANT"
            details["severity"] = "LOW"
        elif "NON-COMPLIANT" in upper_text:
            details["verdict"] = "NON-COMPLIANT"
            details["severity"] = "CRITICAL" if ("CRITICAL" in upper_text or "EMERGENCY" in upper_text) else "HIGH"
        elif "CONDITIONAL" in upper_text:
            details["verdict"] = "CONDITIONAL APPROVAL"
            details["severity"] = "MODERATE"

        # Extract recommendations / remediation section if present
        rec_match = re.search(
            r"(?:###?\s*(?:3|C|Mandated Remediation|Remediation|Recommendations)[\w\s:]*\n)([\s\S]*?)(?:###|$)",
            audit_text,
            re.IGNORECASE,
        )
        if rec_match:
            rec_content = rec_match.group(1).strip()
            if rec_content:
                details["recommendations"] = rec_content[:600]
        else:
            lines = [line.strip() for line in audit_text.split("\n") if line.strip() and not line.startswith("#")]
            if lines:
                details["recommendations"] = lines[-1][:400]

        return details

    def _create_hero_steps(self) -> List[WorkflowStep]:
        """Generate the standard ordered step graph for the Hero Workflow."""
        return [
            WorkflowStep(
                id="step_1_extract",
                name="extract_document",
                title="1. Document Extraction & OCR",
                status="pending",
                tool_name="tool_extract_document",
            ),
            WorkflowStep(
                id="step_2_search_sops",
                name="knowledge_retrieval",
                title="2. Local SOP Knowledge Search",
                status="pending",
                tool_name="tool_knowledge_retrieval",
            ),
            WorkflowStep(
                id="step_3_audit",
                name="compliance_audit",
                title="3. RAG Compliance & Risk Audit",
                status="pending",
                tool_name="tool_compliance_audit",
            ),
            WorkflowStep(
                id="step_4_hitl_checkpoint",
                name="human_approval_checkpoint",
                title="4. Human-in-the-Loop (HITL) Checkpoint",
                status="pending",
                tool_name="tool_human_approval_checkpoint",
            ),
            WorkflowStep(
                id="step_5_generate_docx",
                name="generate_approval_note",
                title="5. DOCX Approval Note Generation",
                status="pending",
                tool_name="tool_generate_docx",
            ),
        ]

    async def start_hero_execution(
        self,
        document_id: str,
        custom_prompt: Optional[str] = None,
        sop_document_ids: Optional[List[str]] = None,
        reviewer_name: Optional[str] = "Chief Plant Engineer",
    ) -> WorkflowExecution:
        """
        Initialize and run the primary Industrial Hero Workflow up to the HITL checkpoint.
        """
        doc = self.document_service.get_document(document_id)
        if not doc:
            raise ValueError(f"Target document ID '{document_id}' not found in registry.")

        execution_id = f"wf_{uuid.uuid4().hex[:12]}"
        now_str = datetime.datetime.now().isoformat()

        doc_name = getattr(doc, "filename", getattr(doc, "original_filename", "document.pdf"))
        execution = WorkflowExecution(
            id=execution_id,
            workflow_type="industrial_hero_audit",
            status="running",
            document_id=document_id,
            document_name=doc_name,
            steps=self._create_hero_steps(),
            current_step_index=0,
            reviewer_name=reviewer_name,
            created_at=now_str,
            updated_at=now_str,
        )

        self._executions[execution_id] = execution
        self._save_executions()

        # Launch the workflow in the background
        task = asyncio.create_task(
            self._execute_hero_pipeline(execution_id, custom_prompt, sop_document_ids)
        )
        self._running_tasks[execution_id] = task

        return execution

    def cancel_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """
        Cancel a running or pending workflow execution immediately.
        """
        execution = self._executions.get(execution_id)
        if not execution:
            return None

        task = self._running_tasks.pop(execution_id, None)
        if task and not task.done():
            task.cancel()
            logger.info(f"Cancelled background task for workflow {execution_id}")

        if execution.status in ["running", "waiting_for_approval"]:
            execution.status = "rejected"
            execution.updated_at = datetime.datetime.now().isoformat()
            if execution.current_step_index < len(execution.steps):
                step = execution.steps[execution.current_step_index]
                if step.status == "running":
                    step.status = "failed"
                    step.error_message = "Audit cancelled by user."
            self._save_executions()

        return execution

    async def _execute_hero_pipeline(
        self,
        execution_id: str,
        custom_prompt: Optional[str] = None,
        sop_document_ids: Optional[List[str]] = None,
    ):
        """
        Execute Steps 1 to 4 and pause at the HITL Checkpoint.
        """
        execution = self._executions.get(execution_id)
        if not execution:
            return

        start_time = time.perf_counter()
        logger.info(f"Starting Workflow Execution {execution_id} for doc {execution.document_name}")

        try:
            # ─── STEP 1: Document Extraction ───
            step1 = execution.steps[0]
            step1.status = "running"
            step1.started_at = datetime.datetime.now().isoformat()
            execution.current_step_index = 0
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

            ext_resp = await self.document_service.extract_text(execution.document_id)
            step1.status = "completed"
            step1.completed_at = datetime.datetime.now().isoformat()
            step1.output_summary = f"Extracted {ext_resp.char_count} characters via {ext_resp.method}."
            step1.output_data = {"char_count": ext_resp.char_count, "method": ext_resp.method}
            execution.extracted_text = ext_resp.extracted_text
            self._save_executions()

            # ─── STEP 2: Knowledge Retrieval (ChromaDB) ───
            step2 = execution.steps[1]
            step2.status = "running"
            step2.started_at = datetime.datetime.now().isoformat()
            execution.current_step_index = 1
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

            # Query ChromaDB with sample text snippet
            search_query = execution.extracted_text[:400] if execution.extracted_text else "wall thickness limits"
            scored_chunks = await self.retrieval_service.retrieve_relevant_chunks(
                query=search_query,
                top_k=4,
            )

            citations: List[GroundedCitation] = []
            for item in scored_chunks:
                c = item.chunk
                citations.append(
                    GroundedCitation(
                        document_id=c.document_id,
                        document_name=c.filename,
                        page_number=c.page_number,
                        chunk_index=c.chunk_index,
                        similarity_score=item.similarity_score,
                        excerpt=c.content[:280] + ("..." if len(c.content) > 280 else ""),
                    )
                )

            step2.status = "completed"
            step2.completed_at = datetime.datetime.now().isoformat()
            step2.output_summary = f"Matched {len(citations)} relevant SOP chunks from ChromaDB."
            step2.output_data = {"citations_count": len(citations)}
            execution.grounded_citations = citations
            self._save_executions()

            # ─── STEP 3: RAG Compliance Audit ───
            step3 = execution.steps[2]
            step3.status = "running"
            step3.started_at = datetime.datetime.now().isoformat()
            execution.current_step_index = 2
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

            audit_resp = await self.rag_service.rag_audit_document(
                document_id=execution.document_id,
                document_name=execution.document_name,
                extracted_text=execution.extracted_text or "",
                custom_focus=custom_prompt,
                top_k=4,
            )

            step3.status = "completed"
            step3.completed_at = datetime.datetime.now().isoformat()
            step3.output_summary = f"Generated audit analysis with {len(audit_resp.grounded_citations)} grounded citations."
            step3.output_data = {"model": audit_resp.model, "duration_ms": audit_resp.duration_ms}
            execution.audit_analysis = audit_resp.analysis
            if audit_resp.grounded_citations:
                execution.grounded_citations = audit_resp.grounded_citations
            self._save_executions()

            # ─── STEP 4: HITL Human Checkpoint (PAUSE) ───
            step4 = execution.steps[3]
            step4.status = "waiting_approval"
            step4.started_at = datetime.datetime.now().isoformat()
            step4.output_summary = "Audit complete. Execution paused awaiting human sign-off."
            execution.current_step_index = 3
            execution.status = "waiting_for_approval"
            execution.approval_status = "waiting"
            execution.duration_ms = (time.perf_counter() - start_time) * 1000.0
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

            logger.info(f"Workflow Execution {execution_id} reached HITL Checkpoint (PAUSED).")

        except Exception as e:
            logger.error(f"Workflow execution {execution_id} failed: {e}", exc_info=True)
            execution.status = "failed"
            execution.error = str(e)
            current_step = execution.steps[execution.current_step_index]
            current_step.status = "failed"
            current_step.error = str(e)
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

    async def submit_human_decision(
        self,
        execution_id: str,
        request: ApprovalDecisionRequest,
    ) -> ApprovalDecisionResponse:
        """
        Process the human sign-off decision (Approve or Reject).
        If Approved -> Resumes Step 5 and generates the DOCX approval note.
        If Rejected -> Halts workflow in rejected status.
        """
        execution = self._executions.get(execution_id)
        if not execution:
            raise ValueError(f"Workflow execution '{execution_id}' not found.")

        if execution.status != "waiting_for_approval":
            raise ValueError(f"Execution {execution_id} is in '{execution.status}' state and not waiting for approval.")

        execution.reviewer_name = request.reviewer_name
        execution.reviewer_notes = request.reviewer_notes
        execution.edited_recommendations = request.edited_recommendations
        execution.updated_at = datetime.datetime.now().isoformat()

        step4 = execution.steps[3]
        step5 = execution.steps[4]

        if request.decision.lower() == "approve":
            step4.status = "completed"
            step4.completed_at = datetime.datetime.now().isoformat()
            step4.output_summary = f"Approved by {request.reviewer_name}."
            step4.output_data = {"decision": "approved", "reviewer": request.reviewer_name}
            execution.approval_status = "approved"

            # ─── STEP 5: DOCX Generation ───
            step5.status = "running"
            step5.started_at = datetime.datetime.now().isoformat()
            execution.current_step_index = 4
            self._save_executions()

            # Compile DOCX content dynamically from LLM evaluation and user input
            parsed_audit = self._parse_audit_details(execution.audit_analysis)

            doc_content = ApprovalNoteContent(
                title="SOVEREIGN INDUSTRIAL COMPLIANCE APPROVAL NOTE",
                reference_id=f"SOV-APR-{execution_id[-6:].upper()}",
                date=datetime.datetime.now().strftime("%Y-%m-%d"),
                plant_area=f"Target Asset: {execution.document_name}",
                equipment_id=f"Document ID: {execution.document_id[:8].upper()}",
                inspector_name="Sovereign Compliance AI Engine (On-Premise)",
                approver_name=request.reviewer_name,
                executive_summary=(
                    f"Automated sovereign AI compliance review for document '{execution.document_name}'. "
                    f"Findings evaluated locally against grounded ChromaDB organizational knowledge base."
                ),
                inspection_findings=execution.extracted_text or "No defect data extracted.",
                sop_evaluations=execution.grounded_citations,
                risk_severity=parsed_audit["severity"],
                mandatory_actions=(
                    request.edited_recommendations or
                    parsed_audit["recommendations"]
                ),
                compliance_verdict=parsed_audit["verdict"],
                reviewer_notes=request.reviewer_notes or "Validated against grounded operational standards.",
            )

            # Generate file
            artifact_info = self.docx_service.generate_approval_note(
                execution_id=execution_id,
                content=doc_content,
                filename_prefix=execution.document_name.split(".")[0],
            )

            step5.status = "completed"
            step5.completed_at = datetime.datetime.now().isoformat()
            step5.output_summary = f"Generated approval note: {artifact_info['filename']} ({artifact_info['size_bytes']} bytes)."
            step5.output_data = artifact_info

            execution.artifact_filename = artifact_info["filename"]
            execution.artifact_path = artifact_info["path"]
            execution.artifact_url = artifact_info["url"]
            execution.status = "completed"
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

            try:
                from app.services.audit_logger import audit_logger
                audit_logger.record_event(
                    event_type="HITL_APPROVAL",
                    severity="INFO",
                    actor=request.reviewer_name or "Chief Engineer",
                    details={
                        "execution_id": execution_id,
                        "decision": "approved",
                        "document_name": execution.document_name,
                        "notes": request.reviewer_notes,
                        "artifact_filename": artifact_info["filename"]
                    }
                )
            except Exception as err:
                logger.debug(f"Audit log emission skipped: {err}")

            logger.info(f"Workflow {execution_id} completed successfully. Artifact: {artifact_info['filename']}")

            return ApprovalDecisionResponse(
                execution_id=execution_id,
                decision="approved",
                status="completed",
                artifact_ready=True,
                artifact_url=artifact_info["url"],
                message="Workflow approved and DOCX approval note generated successfully.",
            )

        else:
            # Human Rejected
            step4.status = "completed"
            step4.completed_at = datetime.datetime.now().isoformat()
            step4.output_summary = f"Rejected by {request.reviewer_name}: {request.reviewer_notes or 'No reason provided.'}"
            step4.output_data = {"decision": "rejected", "reviewer": request.reviewer_name}

            step5.status = "failed"
            step5.output_summary = "DOCX generation aborted due to human rejection."

            execution.approval_status = "rejected"
            execution.status = "rejected"
            execution.updated_at = datetime.datetime.now().isoformat()
            self._save_executions()

            logger.info(f"Workflow {execution_id} rejected by human reviewer.")

            return ApprovalDecisionResponse(
                execution_id=execution_id,
                decision="rejected",
                status="rejected",
                artifact_ready=False,
                artifact_url=None,
                message=f"Workflow execution rejected by {request.reviewer_name}.",
            )


# Singleton accessor
_workflow_engine_instance: Optional[WorkflowEngine] = None


def get_workflow_engine() -> WorkflowEngine:
    global _workflow_engine_instance
    if _workflow_engine_instance is None:
        _workflow_engine_instance = WorkflowEngine()
    return _workflow_engine_instance
