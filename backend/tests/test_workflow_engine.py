import asyncio
import io
import logging
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.models.schemas import ApprovalDecisionRequest
from app.services.document_service import get_document_service
from app.services.knowledge_service import get_knowledge_service
from app.services.workflow_engine import get_workflow_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_workflow_engine")


async def run_workflow_engine_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - AGENTIC WORKFLOW & HITL TEST")
    print("=" * 60)

    doc_svc = get_document_service()
    kb_svc = get_knowledge_service()
    engine = get_workflow_engine()

    # Step 1: Ensure we have the SOP in Knowledge Base
    print("\n[STEP 1] Checking Knowledge Base in ChromaDB...")
    existing_docs = await kb_svc.get_all_documents()
    if not existing_docs:
        fixture_path = backend_dir / "tests" / "fixtures" / "SOP-REF-570_Piping_Integrity.txt"
        if fixture_path.exists():
            with open(fixture_path, "r", encoding="utf-8") as f:
                sop_text = f.read()
            kb_resp = await kb_svc.ingest_text(
                title="SOP-REF-570_Piping_Integrity.txt",
                content=sop_text,
                metadata={"type": "standard", "facility": "refinery"},
            )
            print(f"SOP Ingested: ID={kb_resp.document_id}, Chunks={kb_resp.total_chunks}")
    else:
        print(f"Using existing ChromaDB knowledge base ({len(existing_docs)} documents).")

    # Step 2: Upload or reuse a test inspection document
    pdf_content = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
        b"4 0 obj<</Length 180>>stream\nBT /F1 12 Tf 72 712 Td (ULTRASONIC INSPECTION REPORT: Line 102 Carbon Steel Spool A. Measured wall thickness at Point A: 2.15 mm. Nominal thickness: 6.02 mm. Severe localized thinning detected.) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n440\n%%EOF\n"
    )
    from fastapi import UploadFile
    upload_file = UploadFile(
        filename="inspection_Line102_wf_test.pdf",
        file=io.BytesIO(pdf_content),
    )
    doc_resp = await doc_svc.save_uploaded_file(upload_file)
    print(f"Document Uploaded: ID={doc_resp.id}, Name={doc_resp.filename}")

    # Step 3: Launch the Hero Workflow Execution
    print("\n[STEP 3] Launching Autonomous Hero Workflow...")
    execution = await engine.start_hero_execution(
        document_id=doc_resp.id,
        custom_prompt="Verify if 2.15 mm wall thickness violates SOP retirement limit and requires emergency replacement.",
        reviewer_name="Chief Plant Engineer",
    )
    print(f"Workflow Launched: ID={execution.id}, Status={execution.status}")
    assert execution.id is not None
    assert len(execution.steps) == 5

    # Step 4: Wait for the pipeline to execute up to Step 4 (HITL Checkpoint)
    print("\n[STEP 4] Monitoring Pipeline Execution until HITL Checkpoint (PAUSE)...")
    max_wait = 300  # seconds
    waited = 0
    poll_interval = 2

    while waited < max_wait:
        await asyncio.sleep(poll_interval)
        waited += poll_interval
        current_exec = engine.get_execution(execution.id)
        assert current_exec is not None
        print(f"  -> Poll ({waited}s): Status='{current_exec.status}', Current Step={current_exec.current_step_index} ({current_exec.steps[current_exec.current_step_index].title})")

        if current_exec.status == "waiting_for_approval":
            print(f"PIPELINE PAUSED AT HITL CHECKPOINT! (Reached in {waited}s)")
            break
        elif current_exec.status == "failed":
            raise RuntimeError(f"Workflow execution failed unexpectedly: {current_exec.error}")

    assert current_exec.status == "waiting_for_approval", f"Expected waiting_for_approval, got {current_exec.status}"
    assert current_exec.extracted_text is not None
    assert len(current_exec.grounded_citations) > 0
    assert current_exec.audit_analysis is not None
    print(f"Audit Analysis Preview:\n{current_exec.audit_analysis[:300]}...")
    print(f"Grounded Citations Count: {len(current_exec.grounded_citations)}")
    print("STEP 4 PASSED: Pipeline extracted text, searched ChromaDB, audited compliance, and paused for human approval!")

    # Step 5: Submit Human-in-the-Loop Approval Decision
    print("\n[STEP 5] Submitting Human Approval Sign-Off (Approve & Generate DOCX)...")
    approval_req = ApprovalDecisionRequest(
        decision="approve",
        reviewer_name="Chief Plant Engineer John Doe",
        reviewer_notes="Wall thickness reading verified by ultrasonic probe calibration. Spool replacement approved for next outage window.",
        edited_recommendations="Immediate line depressurization and mandatory emergency spool replacement within 48 hours.",
    )

    decision_resp = await engine.submit_human_decision(
        execution_id=execution.id,
        request=approval_req,
    )
    print(f"Approval Response: Decision='{decision_resp.decision}', Status='{decision_resp.status}', Artifact Ready={decision_resp.artifact_ready}")
    assert decision_resp.decision == "approved"
    assert decision_resp.status == "completed"
    assert decision_resp.artifact_ready is True
    assert decision_resp.artifact_url is not None

    final_exec = engine.get_execution(execution.id)
    assert final_exec.status == "completed"
    assert final_exec.artifact_path is not None
    assert os.path.exists(final_exec.artifact_path)
    print(f"Generated DOCX Artifact: {final_exec.artifact_path}")
    print("STEP 5 PASSED: Human approval processed and DOCX approval note generated successfully!")

    print("\n" + "=" * 60)
    print("ALL AGENTIC WORKFLOW & HITL TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_workflow_engine_tests())
