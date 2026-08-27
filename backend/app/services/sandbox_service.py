import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings
from app.services.security_guard import SecurityGuard

logger = logging = __import__("logging").getLogger("app.services.sandbox_service")


class SandboxResult:
    def __init__(
        self,
        run_id: str,
        success: bool,
        exit_code: int,
        stdout: str,
        stderr: str,
        duration_ms: float,
        tests_total: int = 0,
        tests_passed: int = 0,
        tests_failed: int = 0,
        error_message: Optional[str] = None,
        timed_out: bool = False,
        sandbox_mode: str = "subprocess_isolated",
    ):
        self.run_id = run_id
        self.success = success
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.duration_ms = duration_ms
        self.tests_total = tests_total
        self.tests_passed = tests_passed
        self.tests_failed = tests_failed
        self.error_message = error_message
        self.timed_out = timed_out
        self.sandbox_mode = sandbox_mode

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "success": self.success,
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "duration_ms": round(self.duration_ms, 2),
            "tests_total": self.tests_total,
            "tests_passed": self.tests_passed,
            "tests_failed": self.tests_failed,
            "error_message": self.error_message,
            "timed_out": self.timed_out,
            "sandbox_mode": self.sandbox_mode,
        }


class SandboxService:
    """
    Sandboxed Tool Execution Environment for Sovereign AI Workbench.
    Executes untrusted agent-generated code & test suites under strict air-gap isolation.
    """

    def __init__(self, sandbox_base_dir: Optional[str] = None):
        self.base_dir = Path(sandbox_base_dir or (Path(settings.DATA_DIR) / "sandbox_runs"))
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._docker_available: Optional[bool] = None

    def check_docker_available(self) -> bool:
        """Check if Docker CLI and daemon are responding on host."""
        if self._docker_available is not None:
            return self._docker_available

        try:
            res = subprocess.run(
                ["docker", "info"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2.0,
                text=True,
            )
            self._docker_available = (res.returncode == 0)
        except Exception:
            self._docker_available = False

        logger.info(f"Sandbox Docker Status: {'AVAILABLE' if self._docker_available else 'NOT AVAILABLE (using isolated subprocess)'}")
        return self._docker_available

    def run_code_and_tests(
        self,
        code: str,
        tests: str,
        timeout_seconds: float = 5.0,
        enforce_security_guard: bool = True,
    ) -> SandboxResult:
        """
        Execute code and companion unit tests inside an isolated sandbox.
        """
        run_id = f"sbx_{uuid.uuid4().hex[:10]}"
        start_time = time.perf_counter()

        # Step 1: Pre-Execution AST Security Policy Check
        if enforce_security_guard:
            for label, src in (("Solution Code", code), ("Test Suite", tests)):
                passed, violations = SecurityGuard.validate_code(src)
                if not passed:
                    duration_ms = (time.perf_counter() - start_time) * 1000.0
                    return SandboxResult(
                        run_id=run_id,
                        success=False,
                        exit_code=1,
                        stdout="",
                        stderr="\n".join(violations),
                        duration_ms=duration_ms,
                        error_message=f"Security Policy Check Failed on {label}: {violations[0]}",
                        sandbox_mode="pre_execution_guard",
                    )

        # Step 2: Prepare Isolated Directory
        run_dir = self.base_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        try:
            solution_file = run_dir / "solution.py"
            test_file = run_dir / "test_suite.py"
            runner_file = run_dir / "runner.py"

            with open(solution_file, "w", encoding="utf-8") as f:
                f.write(code)

            with open(test_file, "w", encoding="utf-8") as f:
                f.write(tests)

            # Generate standardized test runner script
            runner_code = self._generate_runner_script()
            with open(runner_file, "w", encoding="utf-8") as f:
                f.write(runner_code)

            # Step 3: Execute in Docker or Restricted Subprocess
            if self.check_docker_available():
                return self._run_in_docker(run_id, run_dir, timeout_seconds, start_time)
            else:
                return self._run_in_subprocess(run_id, run_dir, timeout_seconds, start_time)

        finally:
            # Clean up ephemeral run directory
            try:
                shutil.rmtree(run_dir, ignore_errors=True)
            except Exception as e:
                logger.warning(f"Failed to clean up sandbox directory {run_dir}: {e}")

    def _generate_runner_script(self) -> str:
        """Create an automated test harness that executes unittest / pytest and outputs JSON metrics."""
        return """
import sys
import unittest
import json
import time

try:
    # Ensure current directory is on sys.path
    if '.' not in sys.path:
        sys.path.insert(0, '.')

    loader = unittest.TestLoader()
    suite = loader.discover('.', pattern='test_suite.py')
    runner = unittest.TextTestRunner(verbosity=2)

    start = time.perf_counter()
    result = runner.run(suite)
    duration = time.perf_counter() - start

    output_metrics = {
        "tests_total": result.testsRun,
        "tests_passed": result.testsRun - len(result.failures) - len(result.errors),
        "tests_failed": len(result.failures) + len(result.errors),
        "was_successful": result.wasSuccessful(),
        "duration_seconds": duration,
    }
    print("__SOVEREIGN_METRICS_START__")
    print(json.dumps(output_metrics))
    print("__SOVEREIGN_METRICS_END__")

    sys.exit(0 if result.wasSuccessful() else 1)

except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
"""

    def _run_in_subprocess(
        self,
        run_id: str,
        run_dir: Path,
        timeout_seconds: float,
        start_time: float,
    ) -> SandboxResult:
        """Execute inside restricted subprocess sandbox with timeout and environment scrubbing."""
        clean_env = {
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
            "PYTHONPATH": str(run_dir),
            "PYTHONUNBUFFERED": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
        }

        # Use current Python executable
        py_exe = sys.executable

        try:
            proc = subprocess.run(
                [py_exe, "runner.py"],
                cwd=str(run_dir),
                env=clean_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout_seconds,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            stdout, metrics = self._parse_metrics(proc.stdout)

            total = metrics.get("tests_total", 0)
            passed = metrics.get("tests_passed", 0)
            failed = metrics.get("tests_failed", 0)
            is_success = (proc.returncode == 0) and (failed == 0)

            return SandboxResult(
                run_id=run_id,
                success=is_success,
                exit_code=proc.returncode,
                stdout=stdout,
                stderr=proc.stderr,
                duration_ms=duration_ms,
                tests_total=total,
                tests_passed=passed,
                tests_failed=failed,
                error_message=proc.stderr if not is_success else None,
                timed_out=False,
                sandbox_mode="subprocess_isolated",
            )

        except subprocess.TimeoutExpired as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxResult(
                run_id=run_id,
                success=False,
                exit_code=-1,
                stdout=e.stdout or "",
                stderr=e.stderr or f"Execution timed out after {timeout_seconds} seconds.",
                duration_ms=duration_ms,
                error_message=f"TimeoutExpired: Execution exceeded {timeout_seconds}s limit (potential infinite loop).",
                timed_out=True,
                sandbox_mode="subprocess_isolated",
            )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxResult(
                run_id=run_id,
                success=False,
                exit_code=1,
                stdout="",
                stderr=str(e),
                duration_ms=duration_ms,
                error_message=f"Sandbox execution error: {str(e)}",
                timed_out=False,
                sandbox_mode="subprocess_isolated",
            )

    def _run_in_docker(
        self,
        run_id: str,
        run_dir: Path,
        timeout_seconds: float,
        start_time: float,
    ) -> SandboxResult:
        """Execute inside ephemeral Docker container with network disabled and CPU/memory caps."""
        cmd = [
            "docker", "run", "--rm",
            "--network", "none",
            "--memory", "128m",
            "--cpus", "1.0",
            "-v", f"{run_dir.resolve()}:/sandbox",
            "-w", "/sandbox",
            "python:3.11-slim",
            "python", "runner.py",
        ]

        try:
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout_seconds + 3.0,  # extra margin for docker boot
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            stdout, metrics = self._parse_metrics(proc.stdout)

            total = metrics.get("tests_total", 0)
            passed = metrics.get("tests_passed", 0)
            failed = metrics.get("tests_failed", 0)
            is_success = (proc.returncode == 0) and (failed == 0)

            return SandboxResult(
                run_id=run_id,
                success=is_success,
                exit_code=proc.returncode,
                stdout=stdout,
                stderr=proc.stderr,
                duration_ms=duration_ms,
                tests_total=total,
                tests_passed=passed,
                tests_failed=failed,
                error_message=proc.stderr if not is_success else None,
                timed_out=False,
                sandbox_mode="docker_isolated",
            )

        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return SandboxResult(
                run_id=run_id,
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Docker execution timed out after {timeout_seconds}s.",
                duration_ms=duration_ms,
                error_message=f"TimeoutExpired: Docker container exceeded {timeout_seconds}s limit.",
                timed_out=True,
                sandbox_mode="docker_isolated",
            )
        except Exception as e:
            # Fallback to subprocess if Docker fails at runtime
            logger.warning(f"Docker run failed ({e}), falling back to subprocess.")
            return self._run_in_subprocess(run_id, run_dir, timeout_seconds, start_time)

    def _parse_metrics(self, raw_stdout: str) -> tuple[str, Dict[str, Any]]:
        """Extract structured JSON metrics from runner output and return clean stdout."""
        metrics: Dict[str, Any] = {}
        if "__SOVEREIGN_METRICS_START__" in raw_stdout and "__SOVEREIGN_METRICS_END__" in raw_stdout:
            parts = raw_stdout.split("__SOVEREIGN_METRICS_START__")
            clean_stdout = parts[0]
            metric_part = parts[1].split("__SOVEREIGN_METRICS_END__")[0].strip()
            try:
                import json
                metrics = json.loads(metric_part)
            except Exception:
                pass
            return clean_stdout.strip(), metrics
        return raw_stdout.strip(), metrics


# Singleton
_sandbox_service_instance: Optional[SandboxService] = None


def get_sandbox_service() -> SandboxService:
    global _sandbox_service_instance
    if _sandbox_service_instance is None:
        _sandbox_service_instance = SandboxService()
    return _sandbox_service_instance
