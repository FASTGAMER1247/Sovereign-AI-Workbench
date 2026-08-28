import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


def run_security_routes_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - PHASE 6 SECURITY ROUTES TEST")
    print("=" * 60)

    client = TestClient(app)

    # 1. GET /api/sovereignty/status
    print("\n[STEP 1] Testing GET /api/sovereignty/status...")
    resp = client.get("/api/sovereignty/status")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "grade" in data
    assert "sovereignty_score_pct" in data
    assert data["bound_host"] == "127.0.0.1"
    print(f"  Sovereignty Grade: {data['grade']} | Score: {data['sovereignty_score_pct']}%")

    # 2. POST /api/sovereignty/probe
    print("\n[STEP 2] Testing POST /api/sovereignty/probe...")
    resp = client.post("/api/sovereignty/probe")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert len(data["egress_probes"]) >= 4
    print(f"  Total Probes Evaluated: {len(data['egress_probes'])}")

    # 3. GET /api/audit/ledger
    print("\n[STEP 3] Testing GET /api/audit/ledger...")
    resp = client.get("/api/audit/ledger?limit=10")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "total_events" in data
    assert "chain_valid" in data
    print(f"  Ledger Events Count: {data['total_events']} | Chain Valid: {data['chain_valid']}")

    # 4. GET /api/audit/verify
    print("\n[STEP 4] Testing GET /api/audit/verify...")
    resp = client.get("/api/audit/verify")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["is_valid"] is True
    print(f"  Hash-Chain Verification: {data['message']}")

    # 5. GET /api/audit/export (CSV and JSONL)
    print("\n[STEP 5] Testing GET /api/audit/export...")
    resp_csv = client.get("/api/audit/export?format=csv")
    assert resp_csv.status_code == 200
    assert "Index,Timestamp,Event_Type" in resp_csv.text

    resp_jsonl = client.get("/api/audit/export?format=jsonl")
    assert resp_jsonl.status_code == 200
    print("  CSV & JSONL exports verified successfully!")

    print("=" * 60)
    print("ALL SECURITY ROUTES TESTS PASSED! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    run_security_routes_tests()
