import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.sovereignty_service import SovereigntyService


def run_sovereignty_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - SOVEREIGNTY SERVICE TESTS")
    print("=" * 60)

    service = SovereigntyService()

    # 1. Probe network egress
    print("\n[TEST 1] Testing Egress Probing across external targets...")
    probes = service.probe_network_egress(timeout_seconds=0.3)
    assert len(probes) >= 4, f"Expected >=4 probe targets, got {len(probes)}"
    for p in probes:
        print(f"  Target: {p.target} | Type: {p.target_type} | Blocked: {p.blocked} | {p.duration_ms}ms")
        assert p.duration_ms >= 0.0
    print("TEST 1 PASSED: Egress probes completed with telemetry metrics!")

    # 2. Get Sovereignty Scorecard
    print("\n[TEST 2] Testing Sovereignty Scorecard & Grade Calculation...")
    status = service.get_sovereignty_status(run_live_probe=True)
    print(f"  Grade: {status.grade}")
    print(f"  Score: {status.sovereignty_score_pct}%")
    print(f"  DNS Leaks: {status.dns_leaks_detected}")
    print(f"  Bound Host: {status.bound_host}")
    assert status.grade is not None
    assert 0.0 <= status.sovereignty_score_pct <= 100.0
    assert status.probed_at is not None
    print("TEST 2 PASSED: Sovereignty scorecard calculated successfully!")

    print("=" * 60)
    print("ALL SOVEREIGNTY SERVICE TESTS PASSED! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    run_sovereignty_tests()
