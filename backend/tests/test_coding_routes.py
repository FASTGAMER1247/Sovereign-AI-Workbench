import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)


def test_coding_routes():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - CODING API ENDPOINTS TEST")
    print("=" * 60)

    # 1. Test Sandbox Status Endpoint
    print("\n[STEP 1] Testing GET /api/coding/sandbox/status...")
    res = client.get("/api/coding/sandbox/status")
    assert res.status_code == 200, f"Sandbox status failed: {res.text}"
    status_data = res.json()
    assert "docker_available" in status_data
    assert "active_engine" in status_data
    print(f"  Sandbox Engine: {status_data['active_engine']}, Security Guard: {status_data['security_guard_enforced']}")

    # 2. Test Trigger Coding Workflow Endpoint
    print("\n[STEP 2] Testing POST /api/coding/execute...")
    payload = {
        "prompt": "Write a Python function to calculate monthly loan EMI with tests.",
        "language": "python",
        "max_repairs": 3,
    }
    exec_res = client.post("/api/coding/execute", json=payload)
    assert exec_res.status_code in (200, 202), f"Failed to execute: {exec_res.text}"
    exec_data = exec_res.json()
    exec_id = exec_data["id"]
    assert exec_id.startswith("code_exec_")
    print(f"  Launched execution ID: {exec_id}, status: {exec_data['status']}")

    # 3. Test Get Execution Detail Endpoint
    print(f"\n[STEP 3] Testing GET /api/coding/executions/{exec_id}...")
    detail_res = client.get(f"/api/coding/executions/{exec_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == exec_id
    assert len(detail_data["steps"]) == 6
    print(f"  Steps Count: {len(detail_data['steps'])}, Initial step: {detail_data['steps'][0]['title']}")

    # 4. Test List Executions Endpoint
    print("\n[STEP 4] Testing GET /api/coding/executions...")
    list_res = client.get("/api/coding/executions")
    assert list_res.status_code == 200
    executions_list = list_res.json()
    assert any(e["id"] == exec_id for e in executions_list)
    print(f"  Total executions listed: {len(executions_list)}")

    # 5. Test Cancel Execution Endpoint
    print(f"\n[STEP 5] Testing POST /api/coding/executions/{exec_id}/cancel...")
    cancel_res = client.post(f"/api/coding/executions/{exec_id}/cancel")
    assert cancel_res.status_code == 200
    cancelled_data = cancel_res.json()
    print(f"  Cancellation Status: {cancelled_data['status']}")

    print("\n" + "=" * 60)
    print("ALL CODING API ROUTE TESTS PASSED! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    test_coding_routes()
