import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.models.schemas import CodingWorkflowRequest
from app.services.coding_agent import CodingAgent


async def run_coding_agent_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - CODING AGENT & WORKFLOW B TEST")
    print("=" * 60)

    agent = CodingAgent()

    # Test 1: Start Coding Workflow
    print("\n[STEP 1] Starting Autonomous Coding Workflow (Loan EMI Task)...")
    req = CodingWorkflowRequest(
        prompt="Write a Python function to calculate monthly loan EMI and include unit tests for zero interest, standard loan, and negative input validation.",
        language="python",
        max_repairs=3,
    )
    execution = await agent.start_coding_workflow(req)
    assert execution.id.startswith("code_exec_")
    print(f"Execution initialized: {execution.id}, Model: {execution.model_used}")

    # Test 2: Poll for completion (Wait up to 35 seconds for local LLM + Sandbox)
    print("\n[STEP 2] Monitoring execution progress and sandbox test runner...")
    max_wait = 35
    elapsed = 0
    while elapsed < max_wait:
        await asyncio.sleep(2.0)
        elapsed += 2.0
        updated = agent.get_execution(execution.id)
        if updated and updated.status in ("completed", "failed"):
            execution = updated
            break
        print(f"  ... Step {updated.current_step_index + 1}/6: {updated.steps[updated.current_step_index].title} ({updated.status})")

    assert execution.status == "completed", f"Workflow failed or timed out: {execution.error}"
    print(f"Workflow finished with status: {execution.status} in {execution.duration_ms:.1f}ms")

    # Test 3: Verify AST Security & Sandbox Test Results
    print("\n[STEP 3] Verifying Security Checks and Sandbox Telemetry...")
    assert execution.ast_security_passed is True
    assert execution.tests_total > 0
    assert execution.tests_passed > 0
    print(f"  AST Security Policy: PASSED (0 violations)")
    print(f"  Sandbox Mode: {execution.sandbox_mode}")
    print(f"  Tests Passed: {execution.tests_passed}/{execution.tests_total}")
    print(f"  Repairs Conducted: {execution.repairs_conducted}")

    # Test 4: Verify Python Artifact Generation
    print("\n[STEP 4] Verifying Generated Python Script Artifact...")
    assert execution.artifact_filename is not None
    from app.config import settings
    artifact_path = Path(settings.ARTIFACTS_DIR) / execution.artifact_filename
    assert artifact_path.exists()
    print(f"  Artifact Created: {execution.artifact_filename} ({artifact_path.stat().st_size} bytes)")

    print("\n" + "=" * 60)
    print("ALL CODING AGENT & WORKFLOW B TESTS PASSED! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_coding_agent_tests())
