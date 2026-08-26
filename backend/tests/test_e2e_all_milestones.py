import asyncio
import io
import logging
import os
import sys
import time
from pathlib import Path
import httpx

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_e2e_all_milestones")


async def run_all_milestones_regression_test():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - COMPLETE E2E REGRESSION TEST (M1-M4)")
    print("=" * 60)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=300.0) as client:

        # ─── TEST 1: Health ───
        print("\n[TEST 1] Testing /api/health...")
        resp = await client.get("/api/health")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        print(f"Health Response: status={data['status']}, sovereign_mode={data['sovereign_mode']}")
        assert data["status"] == "ok"
        assert data["sovereign_mode"] is True
        print("TEST 1 PASSED!")

        # ─── TEST 2: Model Health ───
        print("\n[TEST 2] Testing /api/models/health...")
        resp = await client.get("/api/models/health")
        assert resp.status_code == 200
        data = resp.json()
        print(f"Models Health: provider={data['provider']}, default_model={data['default_model']}, available={data['is_model_available']}")
        assert data["is_model_available"] is True
        print("TEST 2 PASSED!")

        # ─── TEST 3: Milestone 1 Direct Chat ───
        print("\n[TEST 3] Testing /api/chat (Milestone 1)...")
        chat_req = {
            "prompt": "Identify yourself in one sentence.",
            "temperature": 0.3,
        }
        resp = await client.post("/api/chat", json=chat_req)
        assert resp.status_code == 200
        data = resp.json()
        print(f"Chat Response from {data['model']}: '{data['response'][:80]}...'")
        assert len(data["response"]) > 0
        print("TEST 3 PASSED!")

        # ─── TEST 4: Milestone 2 Document Upload & PyMuPDF Extraction ───
        print("\n[TEST 4] Testing /api/documents/upload & extraction (Milestone 2)...")
        pdf_content = (
            b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n"
            b"4 0 obj<</Length 180>>stream\nBT /F1 12 Tf 72 712 Td (ULTRASONIC INSPECTION REPORT: Line 102 Carbon Steel Spool A. Measured wall thickness at Point A: 2.15 mm. Nominal thickness: 6.02 mm. Severe localized thinning detected.) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n440\n%%EOF\n"
        )
        files = {"file": ("inspection_Line102.pdf", io.BytesIO(pdf_content), "application/pdf")}
        upload_resp = await client.post("/api/documents/upload", files=files)
        assert upload_resp.status_code == 201
        doc_data = upload_resp.json()
        doc_id = doc_data["id"]
        print(f"Uploaded Doc ID: {doc_id}, filename={doc_data['filename']}")

        ext_resp = await client.post(f"/api/documents/{doc_id}/extract")
        assert ext_resp.status_code == 200
        ext_data = ext_resp.json()
        print(f"Extracted {ext_data['char_count']} chars using {ext_data['method']}.")
        assert ext_data["char_count"] > 0
        print("TEST 4 PASSED!")

        # ─── TEST 5: Milestone 3 Knowledge Base Ingest & Semantic Search ───
        print("\n[TEST 5] Testing /api/knowledge/ingest & /api/knowledge/query (Milestone 3)...")
        sop_text = (
            "SECTION 1: SCOPE\nThis standard specifies thickness limits for refinery piping.\n\n"
            "SECTION 2: THICKNESS THRESHOLDS & MINIMUM WALL REQUIREMENTS\n"
            "2.1 Carbon Steel Piping (ASTM A106 Grade B, Schedule 40/80):\n"
            "- Nominal wall thickness: 6.02 mm (for 4-inch nominal bore line 102).\n"
            "- Minimum design allowable thickness (t_min): 3.20 mm.\n"
            "- Critical Retirement Limit (t_retire): 2.50 mm.\n\n"
            "2.2 Any pipe section exhibiting a measured active wall thickness less than 2.50 mm represents "
            "a Critical Safety Hazard and mandates immediate line depressurization and emergency spool replacement within 48 hours.\n"
        )
        ingest_resp = await client.post(
            "/api/knowledge/ingest",
            json={"title": "SOP-REF-570_Piping_Integrity.txt", "content": sop_text},
        )
        assert ingest_resp.status_code == 201
        kb_data = ingest_resp.json()
        print(f"Ingested SOP Doc ID: {kb_data['document_id']}, chunks={kb_data['total_chunks']}")

        query_resp = await client.post(
            "/api/knowledge/query",
            json={"query": "What is the critical wall thickness retirement limit for line 102?", "top_k": 3},
        )
        assert query_resp.status_code == 200
        q_data = query_resp.json()
        print(f"Query matched {len(q_data['results'])} chunks in {q_data['query_time_ms']:.2f}ms. Top score: {q_data['results'][0]['similarity_score']:.4f}")
        assert len(q_data["results"]) > 0
        print("TEST 5 PASSED!")

        # ─── TEST 6: Milestone 4 Multi-Model Auto-Router ───
        print("\n[TEST 6] Testing /api/router/route (Milestone 4)...")
        route_resp = await client.post(
            "/api/router/route",
            json={"prompt": "Review line 102 wall thickness against refinery SOP limits"},
        )
        assert route_resp.status_code == 200
        r_data = route_resp.json()
        print(f"Router Decision: Task='{r_data['task_type']}', Model='{r_data['selected_model']}', Reason='{r_data['reason']}'")
        assert r_data["task_type"] == "rag_audit"
        assert "qwen3.5:0.8b" in r_data["selected_model"]
        print("TEST 6 PASSED!")

        # ─── TEST 7: Milestone 4 Autonomous Hero Workflow Trigger ───
        print("\n[TEST 7] Testing /api/workflows/execute (Milestone 4)...")
        wf_resp = await client.post(
            "/api/workflows/execute",
            json={
                "document_id": doc_id,
                "custom_prompt": "Audit wall thickness of Line 102 against SOP-REF-570 retirement thresholds.",
                "reviewer_name": "Chief Plant Engineer",
            },
        )
        assert wf_resp.status_code == 201
        wf_data = wf_resp.json()
        wf_id = wf_data["id"]
        print(f"Workflow Triggered: ID={wf_id}, Status={wf_data['status']}, Steps={len(wf_data['steps'])}")
        assert wf_data["status"] == "running"
        print("TEST 7 PASSED!")

        # ─── TEST 8: Milestone 4 Polling Execution until HITL Checkpoint (PAUSE) ───
        print("\n[TEST 8] Polling /api/workflows/executions/{id} until HITL Checkpoint...")
        max_wait = 180
        waited = 0
        poll_interval = 3

        while waited < max_wait:
            await asyncio.sleep(poll_interval)
            waited += poll_interval
            poll_resp = await client.get(f"/api/workflows/executions/{wf_id}")
            assert poll_resp.status_code == 200
            current_exec = poll_resp.json()
            print(f"  -> Poll ({waited}s): Status='{current_exec['status']}', Step Index={current_exec['current_step_index']}")

            if current_exec["status"] == "waiting_for_approval":
                print(f"SUCCESS: Pipeline reached HITL Checkpoint in {waited}s!")
                break
            elif current_exec["status"] == "failed":
                raise RuntimeError(f"Workflow execution failed: {current_exec.get('error')}")

        assert current_exec["status"] == "waiting_for_approval"
        assert len(current_exec["grounded_citations"]) > 0
        assert current_exec["audit_analysis"] is not None
        print("TEST 8 PASSED!")

        # ─── TEST 9: Milestone 4 Human Approval & DOCX Generation ───
        print("\n[TEST 9] Testing /api/workflows/executions/{id}/approve (Milestone 4)...")
        approve_resp = await client.post(
            f"/api/workflows/executions/{wf_id}/approve",
            json={
                "decision": "approve",
                "reviewer_name": "Chief Plant Engineer John Doe",
                "reviewer_notes": "Ultrasonic thickness measurement validated. Approved for immediate replacement.",
                "edited_recommendations": "Depressurize Line 102 within 4 hours and execute emergency spool replacement within 48 hours.",
            },
        )
        assert approve_resp.status_code == 200
        appr_data = approve_resp.json()
        print(f"Approval Result: Decision='{appr_data['decision']}', Status='{appr_data['status']}', Artifact URL='{appr_data['artifact_url']}'")
        assert appr_data["decision"] == "approved"
        assert appr_data["status"] == "completed"
        assert appr_data["artifact_ready"] is True
        print("TEST 9 PASSED!")

        # ─── TEST 10: Milestone 4 DOCX Artifact Download ───
        print("\n[TEST 10] Testing /api/workflows/executions/{id}/artifact (Milestone 4)...")
        art_resp = await client.get(f"/api/workflows/executions/{wf_id}/artifact")
        assert art_resp.status_code == 200
        content_type = art_resp.headers.get("content-type", "")
        file_bytes = len(art_resp.content)
        print(f"Downloaded Artifact: Size={file_bytes} bytes, Content-Type='{content_type}'")
        assert "officedocument.wordprocessingml" in content_type
        assert file_bytes > 5000
        print("TEST 10 PASSED!")

        # Cleanup test document from KB
        await client.delete(f"/api/knowledge/documents/{kb_data['document_id']}")

    print("\n" + "=" * 60)
    print("ALL 10 END-TO-END REGRESSION TESTS (MILESTONES 1-4) PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all_milestones_regression_test())
