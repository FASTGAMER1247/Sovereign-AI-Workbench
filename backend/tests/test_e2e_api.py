import asyncio
import sys
from pathlib import Path
import httpx
import pytest

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

@pytest.mark.anyio
async def test_full_api():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - FULL API REGRESSION TEST")
    print("=" * 60)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health
        print("\n[TEST 1] Testing /api/health...")
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Health Response: status={data['status']}, sovereign_mode={data['sovereign_mode']}")
        assert data["status"] == "ok"
        assert data["sovereign_mode"] is True
        print("TEST 1 PASSED!")

        # 2. Models Health
        print("\n[TEST 2] Testing /api/models/health...")
        res = await client.get("/api/models/health")
        assert res.status_code == 200
        data = res.json()
        print(f"Models Health: provider={data['provider']}, default_model={data['default_model']}, available={data['is_model_available']}")
        assert data["status"] == "ok"
        print("TEST 2 PASSED!")

        # 3. Chat Endpoint (Milestone 1)
        print("\n[TEST 3] Testing /api/chat (Milestone 1)...")
        chat_payload = {
            "prompt": "Hello from Sovereign AI Workbench test suite! Confirm you are running locally.",
            "temperature": 0.1,
            "max_tokens": 50,
        }
        res = await client.post("/api/chat", json=chat_payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        print(f"Chat Response from {data['model']}: '{data['response'][:80]}...'")
        assert len(data["response"]) > 0
        print("TEST 3 PASSED!")

        # 4. Knowledge Ingest (Milestone 3)
        print("\n[TEST 4] Testing /api/knowledge/ingest (Milestone 3)...")
        fixture_path = backend_dir / "tests" / "fixtures" / "SOP-REF-570_Piping_Integrity.txt"
        with open(fixture_path, "r", encoding="utf-8") as f:
            sop_text = f.read()

        ingest_payload = {
            "title": "SOP-REF-570_Piping_Integrity.txt",
            "content": sop_text,
            "metadata": {"department": "Mechanical Integrity", "standard_id": "API-570-REF"},
        }
        res = await client.post("/api/knowledge/ingest", json=ingest_payload)
        assert res.status_code in [200, 201], f"Expected 200/201, got {res.status_code}: {res.text}"
        ingest_data = res.json()
        doc_id = ingest_data["document_id"]
        print(f"Ingested Doc ID: {doc_id}, chunks={ingest_data['total_chunks']}")
        assert ingest_data["total_chunks"] >= 2
        print("TEST 4 PASSED!")

        # 5. Knowledge Stats (Milestone 3)
        print("\n[TEST 5] Testing /api/knowledge/stats (Milestone 3)...")
        res = await client.get("/api/knowledge/stats")
        assert res.status_code == 200
        stats_data = res.json()
        print(f"KB Stats: engine={stats_data['embedding_engine']}, model={stats_data['embedding_model']}, docs={stats_data['total_documents']}, chunks={stats_data['total_chunks']}")
        assert stats_data["embedding_engine"] in ["ollama", "sentence_transformers"]
        assert stats_data["total_chunks"] >= 2
        print("TEST 5 PASSED!")

        # 6. Knowledge Documents List & Chunks (Milestone 3)
        print("\n[TEST 6] Testing /api/knowledge/documents and chunks (Milestone 3)...")
        res = await client.get("/api/knowledge/documents")
        assert res.status_code == 200
        docs_list = res.json()
        print(f"Listed {len(docs_list)} documents in KB.")
        assert len(docs_list) >= 1

        res = await client.get(f"/api/knowledge/documents/{doc_id}/chunks")
        assert res.status_code == 200
        chunks_list = res.json()
        print(f"Retrieved {len(chunks_list)} chunks for document {doc_id}.")
        assert len(chunks_list) >= 2
        print("TEST 6 PASSED!")

        # 7. Semantic Query (Milestone 3)
        print("\n[TEST 7] Testing /api/knowledge/query (Milestone 3)...")
        query_payload = {
            "query": "What is the critical wall thickness retirement limit for line 102?",
            "top_k": 3,
        }
        res = await client.post("/api/knowledge/query", json=query_payload)
        assert res.status_code == 200
        query_data = res.json()
        print(f"Query matched {query_data['total_matched']} chunks in {query_data['query_time_ms']}ms.")
        assert len(query_data["results"]) > 0
        print(f"Top result similarity: {query_data['results'][0]['similarity_score']}")
        assert query_data["results"][0]["similarity_score"] > 0.5
        print("TEST 7 PASSED!")

        # 8. Document Upload & Extraction (Milestone 2)
        print("\n[TEST 8] Testing /api/documents/upload & extraction (Milestone 2)...")
        import fitz
        pdf_doc = fitz.open()
        pdf_page = pdf_doc.new_page()
        pdf_page.insert_text((50, 50), "INSPECTION FINDING: Line 102 wall thickness at point A is 2.15 mm. Urgent action required.")
        pdf_bytes = pdf_doc.tobytes()
        pdf_doc.close()

        files = {"file": ("inspection_Line102.pdf", pdf_bytes, "application/pdf")}
        res = await client.post("/api/documents/upload", files=files)
        assert res.status_code in [200, 201], f"Expected 200/201, got {res.status_code}: {res.text}"
        upload_data = res.json()
        uploaded_doc_id = upload_data["id"]
        print(f"Uploaded Doc ID: {uploaded_doc_id}, filename={upload_data['filename']}")

        res = await client.post(f"/api/documents/{uploaded_doc_id}/extract")
        assert res.status_code == 200
        extract_data = res.json()
        print(f"Extracted {extract_data['char_count']} chars using {extract_data['method']}.")
        assert "2.15 mm" in extract_data["extracted_text"]
        print("TEST 8 PASSED!")

        # 9. RAG Compliance Audit Endpoint (Milestone 3)
        print("\n[TEST 9] Testing /api/documents/{id}/rag-audit (Milestone 3)...")
        rag_payload = {
            "prompt": "Evaluate wall thickness against SOP retirement limit.",
            "top_k_standards": 2,
        }
        res = await client.post(f"/api/documents/{uploaded_doc_id}/rag-audit", json=rag_payload)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        audit_data = res.json()
        print(f"RAG Audit completed by model: {audit_data['model']}")
        print(f"Grounded Citations: {len(audit_data['grounded_citations'])}")
        assert len(audit_data["grounded_citations"]) > 0
        print(f"Audit Analysis Preview:\n{audit_data['analysis'][:200]}...")
        assert len(audit_data["analysis"]) > 50
        print("TEST 9 PASSED!")

        # 10. Delete Document from KB (Milestone 3)
        print("\n[TEST 10] Testing /api/knowledge/documents/{id} DELETE...")
        res = await client.delete(f"/api/knowledge/documents/{doc_id}")
        assert res.status_code == 200
        delete_data = res.json()
        print(f"Delete response: {delete_data}")
        assert delete_data["status"] == "deleted"
        print("TEST 10 PASSED!")

    print("\n" + "=" * 60)
    print("ALL API REGRESSION TESTS (MILESTONES 1, 2, 3) PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_full_api())
