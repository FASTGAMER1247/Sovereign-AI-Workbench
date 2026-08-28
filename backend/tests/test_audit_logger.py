import os
import sys
import json
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.audit_logger import AuditLogger, GENESIS_HASH


def run_audit_logger_tests():
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - AUDIT LOGGER & HASH-CHAIN TESTS")
    print("=" * 60)

    with tempfile.TemporaryDirectory() as tmpdir:
        test_ledger_path = os.path.join(tmpdir, "test_ledger.jsonl")
        logger = AuditLogger(ledger_path=test_ledger_path)

        # 1. Initial State Integrity
        integrity = logger.verify_integrity()
        assert integrity.is_valid is True
        assert integrity.total_blocks_checked == 0
        print("\nTEST 1 PASSED: Empty ledger initial state verified!")

        # 2. Record Sequential Events
        ev1 = logger.record_event(
            event_type="DOCUMENT_INGEST",
            severity="INFO",
            actor="engineer@plant",
            details={"filename": "Line102_Scan.pdf", "size_bytes": 10240}
        )
        assert ev1.index == 1
        assert ev1.prev_hash == GENESIS_HASH
        assert len(ev1.block_hash) == 64

        ev2 = logger.record_event(
            event_type="HITL_APPROVAL",
            severity="CRITICAL",
            actor="Chief Plant Engineer",
            details={"decision": "approve", "notes": "Emergency repair approved within 2 hours"}
        )
        assert ev2.index == 2
        assert ev2.prev_hash == ev1.block_hash
        assert len(ev2.block_hash) == 64

        ev3 = logger.record_event(
            event_type="AST_POLICY_BLOCK",
            severity="SECURITY_ALERT",
            actor="sandbox_guard",
            details={"blocked_import": "socket", "line": 12}
        )
        assert ev3.index == 3
        assert ev3.prev_hash == ev2.block_hash
        print("TEST 2 PASSED: Sequential hash-chaining established!")

        # 3. Verify Untampered Integrity
        integrity_ok = logger.verify_integrity()
        assert integrity_ok.is_valid is True
        assert integrity_ok.total_blocks_checked == 3
        assert integrity_ok.tampered_block_index is None
        print("TEST 3 PASSED: Valid 3-block cryptographic chain verified!")

        # 4. Tamper Detection Test
        # We manually modify the payload of Block #2 in the JSONL file
        with open(test_ledger_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]

        tampered_obj = json.loads(lines[1])
        tampered_obj["details"]["notes"] = "TAMPERED NOTES: Hacker changed timeframe"
        lines[1] = json.dumps(tampered_obj)

        with open(test_ledger_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

        integrity_tampered = logger.verify_integrity()
        assert integrity_tampered.is_valid is False
        assert integrity_tampered.tampered_block_index == 2
        print(f"Tamper detected correctly: {integrity_tampered.message}")
        print("TEST 4 PASSED: Tamper detection immediately catches payload modification!")

        # 5. CSV Export
        csv_data = logger.export_ledger_csv()
        assert "Index,Timestamp,Event_Type" in csv_data
        assert "DOCUMENT_INGEST" in csv_data
        print("TEST 5 PASSED: CSV export generated cleanly!")

    print("=" * 60)
    print("ALL AUDIT LOGGER TESTS PASSED! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    run_audit_logger_tests()
