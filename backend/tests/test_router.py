import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.models.schemas import ModelRouteRequest
from app.services.router_service import get_router_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("test_router")


async def run_router_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - MULTI-MODEL ROUTER TEST")
    print("=" * 60)

    router = get_router_service()

    # 1. Vision Task Route
    print("\n[TEST 1] Testing Vision Task Routing...")
    v_req = ModelRouteRequest(has_images=True, prompt="Inspect turbine blade crack photograph")
    v_resp = await router.route_task(v_req)
    print(f"Task: {v_resp.task_type} -> Selected Model: {v_resp.selected_model} (Reason: {v_resp.reason})")
    assert v_resp.task_type == "vision", f"Expected vision, got {v_resp.task_type}"
    assert "vision" in v_resp.capabilities, f"Model {v_resp.selected_model} must have vision capability"
    print("TEST 1 PASSED!")

    # 2. Embedding Task Route
    print("\n[TEST 2] Testing Embedding Task Routing...")
    e_req = ModelRouteRequest(task_type="embeddings")
    e_resp = await router.route_task(e_req)
    print(f"Task: {e_resp.task_type} -> Selected Model: {e_resp.selected_model} (Reason: {e_resp.reason})")
    assert e_resp.task_type == "embeddings", f"Expected embeddings, got {e_resp.task_type}"
    assert "nomic-embed-text" in e_resp.selected_model or "all-minilm" in e_resp.selected_model.lower()
    print("TEST 2 PASSED!")

    # 3. Coding Task Route
    print("\n[TEST 3] Testing Coding Task Heuristic Routing...")
    c_req = ModelRouteRequest(prompt="def calculate_corrosion_rate(thickness_initial, thickness_current, years):")
    c_resp = await router.route_task(c_req)
    print(f"Task: {c_resp.task_type} -> Selected Model: {c_resp.selected_model} (Reason: {c_resp.reason})")
    assert c_resp.task_type == "coding", f"Expected coding, got {c_resp.task_type}"
    print("TEST 3 PASSED!")

    # 4. RAG Compliance Audit Route
    print("\n[TEST 4] Testing RAG Compliance Audit Heuristic Routing...")
    r_req = ModelRouteRequest(prompt="Verify line 102 wall thickness against refinery SOP retirement limits")
    r_resp = await router.route_task(r_req)
    print(f"Task: {r_resp.task_type} -> Selected Model: {r_resp.selected_model} (Reason: {r_resp.reason})")
    assert r_resp.task_type == "rag_audit", f"Expected rag_audit, got {r_resp.task_type}"
    print("TEST 4 PASSED!")

    # 5. Preferred Model Override Route
    print("\n[TEST 5] Testing Preferred Model Override...")
    o_req = ModelRouteRequest(prompt="Hello", preferred_model="qwen3.5:0.8b")
    o_resp = await router.route_task(o_req)
    print(f"Task: {o_resp.task_type} -> Selected Model: {o_resp.selected_model} (Reason: {o_resp.reason})")
    assert "qwen3.5:0.8b" in o_resp.selected_model
    print("TEST 5 PASSED!")

    print("\n" + "=" * 60)
    print("ALL MULTI-MODEL ROUTER TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_router_tests())
