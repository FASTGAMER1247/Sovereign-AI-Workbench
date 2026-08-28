import json
import os
import hashlib
import threading
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.models.schemas import AuditEvent, LedgerIntegrityResponse

logger = logging.getLogger(__name__)

GENESIS_HASH = "0" * 64


class AuditLogger:
    """
    Cryptographic SHA-256 Hash-Chained Audit Ledger.
    Records all state changes, OCR extractions, vector searches, HITL sign-offs,
    AST security violations, and sandboxed tool executions into an immutable,
    tamper-evident on-premise log.
    """

    def __init__(self, ledger_path: Optional[str] = None):
        self.ledger_path = ledger_path or settings.AUDIT_LEDGER_PATH
        self._lock = threading.Lock()
        self._ensure_dir()

    def _ensure_dir(self):
        os.makedirs(os.path.dirname(self.ledger_path), exist_ok=True)

    @staticmethod
    def _compute_hash(
        index: int,
        timestamp: str,
        event_type: str,
        severity: str,
        actor: str,
        details: Dict[str, Any],
        prev_hash: str
    ) -> str:
        payload = {
            "index": index,
            "timestamp": timestamp,
            "event_type": event_type,
            "severity": severity,
            "actor": actor,
            "details": details,
            "prev_hash": prev_hash,
        }
        encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def _get_last_event(self) -> Optional[AuditEvent]:
        if not os.path.exists(self.ledger_path):
            return None

        last_line = ""
        try:
            with open(self.ledger_path, "r", encoding="utf-8") as f:
                for line in f:
                    line_clean = line.strip()
                    if line_clean:
                        last_line = line_clean
            if last_line:
                data = json.loads(last_line)
                return AuditEvent(**data)
        except Exception as e:
            logger.error(f"Error reading last audit ledger entry: {e}")
        return None

    def record_event(
        self,
        event_type: str,
        severity: str = "INFO",
        actor: str = "system",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        """
        Append a cryptographically chained event to the ledger.
        """
        details = details or {}
        timestamp = datetime.now(timezone.utc).isoformat()

        with self._lock:
            self._ensure_dir()
            last_event = self._get_last_event()

            if last_event is None:
                index = 1
                prev_hash = GENESIS_HASH
            else:
                index = last_event.index + 1
                prev_hash = last_event.block_hash

            block_hash = self._compute_hash(
                index=index,
                timestamp=timestamp,
                event_type=event_type,
                severity=severity,
                actor=actor,
                details=details,
                prev_hash=prev_hash
            )

            event = AuditEvent(
                index=index,
                timestamp=timestamp,
                event_type=event_type,
                severity=severity,
                actor=actor,
                details=details,
                prev_hash=prev_hash,
                block_hash=block_hash
            )

            with open(self.ledger_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(event.model_dump()) + "\n")

            logger.info(f"[AUDIT LEDGER #{index}] {event_type} ({severity}) by {actor}: {block_hash[:12]}...")
            return event

    def get_ledger(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
        reverse: bool = True
    ) -> List[AuditEvent]:
        """
        Retrieve events from the ledger with optional event_type filtering.
        """
        if not os.path.exists(self.ledger_path):
            return []

        events: List[AuditEvent] = []
        with self._lock:
            try:
                with open(self.ledger_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line_clean = line.strip()
                        if line_clean:
                            data = json.loads(line_clean)
                            event = AuditEvent(**data)
                            if event_type and event.event_type.upper() != event_type.upper():
                                continue
                            events.append(event)
            except Exception as e:
                logger.error(f"Failed to read audit ledger: {e}")

        if reverse:
            events.reverse()

        return events[:limit]

    def verify_integrity(self) -> LedgerIntegrityResponse:
        """
        Verifies the cryptographic integrity of the entire SHA-256 hash chain.
        Returns whether the ledger is valid or flags the exact index of any tampered block.
        """
        timestamp_now = datetime.now(timezone.utc).isoformat()

        if not os.path.exists(self.ledger_path):
            return LedgerIntegrityResponse(
                is_valid=True,
                total_blocks_checked=0,
                tampered_block_index=None,
                message="Ledger is empty. Cryptographic state is pristine.",
                verified_at=timestamp_now
            )

        events: List[AuditEvent] = []
        with self._lock:
            try:
                with open(self.ledger_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line_clean = line.strip()
                        if line_clean:
                            events.append(AuditEvent(**json.loads(line_clean)))
            except Exception as e:
                return LedgerIntegrityResponse(
                    is_valid=False,
                    total_blocks_checked=len(events),
                    tampered_block_index=len(events) + 1,
                    message=f"JSON decoding failure in ledger file: {e}",
                    verified_at=timestamp_now
                )

        if not events:
            return LedgerIntegrityResponse(
                is_valid=True,
                total_blocks_checked=0,
                tampered_block_index=None,
                message="Ledger contains zero records.",
                verified_at=timestamp_now
            )

        prev_hash = GENESIS_HASH

        for idx, event in enumerate(events):
            expected_index = idx + 1
            if event.index != expected_index:
                return LedgerIntegrityResponse(
                    is_valid=False,
                    total_blocks_checked=idx,
                    tampered_block_index=event.index,
                    message=f"Sequence anomaly at block #{event.index}: expected #{expected_index}.",
                    verified_at=timestamp_now
                )

            if event.prev_hash != prev_hash:
                return LedgerIntegrityResponse(
                    is_valid=False,
                    total_blocks_checked=idx,
                    tampered_block_index=event.index,
                    message=f"Hash chain broken at block #{event.index}. Previous hash '{event.prev_hash[:12]}...' does not match expected '{prev_hash[:12]}...'.",
                    verified_at=timestamp_now
                )

            expected_block_hash = self._compute_hash(
                index=event.index,
                timestamp=event.timestamp,
                event_type=event.event_type,
                severity=event.severity,
                actor=event.actor,
                details=event.details,
                prev_hash=event.prev_hash
            )

            if event.block_hash != expected_block_hash:
                return LedgerIntegrityResponse(
                    is_valid=False,
                    total_blocks_checked=idx,
                    tampered_block_index=event.index,
                    message=f"Payload corruption detected at block #{event.index}. Content SHA-256 does not match recorded block hash.",
                    verified_at=timestamp_now
                )

            prev_hash = event.block_hash

        return LedgerIntegrityResponse(
            is_valid=True,
            total_blocks_checked=len(events),
            tampered_block_index=None,
            message=f"Cryptographic hash-chain verified: all {len(events)} blocks are authentic and tamper-free.",
            verified_at=timestamp_now
        )

    def export_ledger_csv(self) -> str:
        """
        Export audit records as standard CSV for external auditors.
        """
        events = self.get_ledger(limit=10000, reverse=False)
        lines = ["Index,Timestamp,Event_Type,Severity,Actor,Prev_Hash,Block_Hash,Details"]
        for ev in events:
            details_str = json.dumps(ev.details).replace('"', '""')
            lines.append(
                f'{ev.index},"{ev.timestamp}","{ev.event_type}","{ev.severity}","{ev.actor}","{ev.prev_hash}","{ev.block_hash}","{details_str}"'
            )
        return "\n".join(lines)


# Singleton instance
audit_logger = AuditLogger()
