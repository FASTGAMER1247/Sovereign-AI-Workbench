"""
Sovereign AI Workbench — Standalone Sandbox Test Runner
A dedicated, self-contained test execution harness for untrusted code execution in the sandbox.
Designed to be compiled as sovereign-sandbox-runner.exe for clean, Python-free production environments.
"""
import json
import os
import sys
import time
import unittest


def main():
    # If run_dir passed as argv[1], change directory to it
    if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
        target_dir = os.path.abspath(sys.argv[1])
        os.chdir(target_dir)

    cwd = os.getcwd()
    if cwd not in sys.path:
        sys.path.insert(0, cwd)

    try:
        loader = unittest.TestLoader()
        suite = loader.discover(cwd, pattern="test_suite.py")
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
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
