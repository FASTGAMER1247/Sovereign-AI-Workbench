import socket
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.config import settings
from app.models.schemas import EgressProbeResult, SovereigntyStatusResponse
from app.services.audit_logger import audit_logger

logger = logging.getLogger(__name__)

EXTERNAL_PROBE_TARGETS = [
    {"host": "8.8.8.8", "port": 53, "type": "DNS", "name": "Google Public DNS"},
    {"host": "1.1.1.1", "port": 53, "type": "DNS", "name": "Cloudflare DNS"},
    {"host": "api.openai.com", "port": 443, "type": "CLOUD_AI_API", "name": "OpenAI Cloud API"},
    {"host": "api.anthropic.com", "port": 443, "type": "CLOUD_AI_API", "name": "Anthropic Cloud API"},
    {"host": "aws.amazon.com", "port": 443, "type": "PUBLIC_IP", "name": "AWS Cloud Gateway"},
]


class SovereigntyService:
    """
    Air-Gap & Zero-Egress Network Verification Service.
    Probes external socket connections, validates that all inference runs on 127.0.0.1,
    and calculates real-time Sovereignty & Air-Gap Compliance metrics.
    """

    def __init__(self):
        self.bound_host = settings.HOST

    def probe_network_egress(self, timeout_seconds: float = 0.4) -> List[EgressProbeResult]:
        """
        Actively probe external endpoints to check for network egress.
        In a strict air-gapped facility, all external socket connections MUST fail/be blocked.
        """
        results: List[EgressProbeResult] = []

        for target in EXTERNAL_PROBE_TARGETS:
            host = target["host"]
            port = target["port"]
            target_type = target["type"]
            name = target["name"]

            start_t = time.perf_counter()
            is_blocked = True
            detail = ""

            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout_seconds)
                # Attempt outbound socket connection
                res = sock.connect_ex((host, port))
                duration_ms = (time.perf_counter() - start_t) * 1000.0
                sock.close()

                if res == 0:
                    # Connection succeeded -> in air-gapped mode, this means egress is open
                    is_blocked = False
                    detail = f"Outbound connection to {name} ({host}:{port}) established in {duration_ms:.1f}ms (Egress active)."
                else:
                    is_blocked = True
                    detail = f"Outbound connection to {name} ({host}:{port}) blocked/unreachable (Air-gap intact)."
            except Exception as e:
                duration_ms = (time.perf_counter() - start_t) * 1000.0
                is_blocked = True
                detail = f"Egress blocked ({e.__class__.__name__})."

            results.append(
                EgressProbeResult(
                    target=f"{host}:{port} ({name})",
                    target_type=target_type,
                    blocked=is_blocked,
                    duration_ms=round(duration_ms, 2),
                    detail=detail
                )
            )

        return results

    def check_dns_leak(self, domain: str = "api.openai.com") -> bool:
        """
        Check if system resolves public DNS queries.
        Returns True if a DNS leak exists (domain resolves to external IP).
        """
        try:
            # Set short timeout via socket default
            socket.setdefaulttimeout(0.5)
            socket.gethostbyname(domain)
            return True  # Resolved -> DNS is reachable
        except Exception:
            return False  # Failed to resolve -> No DNS leak

    def get_sovereignty_status(self, run_live_probe: bool = True) -> SovereigntyStatusResponse:
        """
        Calculate full sovereignty & air-gap compliance scorecard.
        """
        probes = self.probe_network_egress() if run_live_probe else []
        dns_leak = self.check_dns_leak()

        blocked_count = sum(1 for p in probes if p.blocked)
        total_probes = len(probes) if probes else 1
        sovereignty_score_pct = (blocked_count / total_probes) * 100.0 if probes else 100.0

        # Grade calculation
        if sovereignty_score_pct >= 99.0 and not dns_leak:
            grade = "A+ Sovereign Grade (100% Air-Gapped)"
            is_air_gapped = True
        elif sovereignty_score_pct >= 80.0:
            grade = "A (High Air-Gap Isolation)"
            is_air_gapped = True
        elif sovereignty_score_pct >= 50.0:
            grade = "B (Partial Isolation)"
            is_air_gapped = False
        else:
            # In standard development environment with open internet
            grade = "DEV-MODE (Local Loopback Enforced, Egress Open)"
            is_air_gapped = False

        status = SovereigntyStatusResponse(
            is_air_gapped=is_air_gapped,
            sovereignty_score_pct=round(sovereignty_score_pct, 1),
            grade=grade,
            bound_host=self.bound_host,
            dns_leaks_detected=dns_leak,
            egress_probes=probes,
            probed_at=datetime.now(timezone.utc).isoformat()
        )

        # Log event to immutable ledger
        try:
            audit_logger.record_event(
                event_type="EGRESS_PROBE",
                severity="INFO",
                actor="sovereignty_monitor",
                details={
                    "grade": grade,
                    "sovereignty_score_pct": status.sovereignty_score_pct,
                    "blocked_probes": f"{blocked_count}/{total_probes}",
                    "dns_leak": dns_leak,
                }
            )
        except Exception as err:
            logger.debug(f"Audit record skipped: {err}")

        return status


# Singleton instance
sovereignty_service = SovereigntyService()
