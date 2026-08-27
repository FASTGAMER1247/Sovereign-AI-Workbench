import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.security_guard import SecurityGuard


def test_safe_code():
    safe_code = """
def calculate_emi(principal: float, rate: float, tenure_months: int) -> float:
    if principal <= 0 or rate < 0 or tenure_months <= 0:
        raise ValueError("Invalid loan parameters")
    if rate == 0:
        return round(principal / tenure_months, 2)
    monthly_rate = rate / (12 * 100)
    emi = (principal * monthly_rate * ((1 + monthly_rate) ** tenure_months)) / (((1 + monthly_rate) ** tenure_months) - 1)
    return round(emi, 2)

import math
import json
import re

assert calculate_emi(100000, 10.0, 12) > 0
"""
    passed, violations = SecurityGuard.validate_code(safe_code)
    assert passed is True, f"Expected safe code to pass, but got violations: {violations}"
    assert len(violations) == 0
    print("TEST 1 PASSED: Safe mathematical & logic code passed security check!")


def test_network_imports_blocked():
    malicious_snippets = [
        "import socket\ns = socket.socket()",
        "import requests\nr = requests.get('http://evil.com')",
        "import urllib.request\nreq = urllib.request.urlopen('http://evil.com')",
        "from http.client import HTTPConnection",
        "import httpx",
    ]
    for idx, snippet in enumerate(malicious_snippets, 1):
        passed, violations = SecurityGuard.validate_code(snippet)
        assert passed is False, f"Expected network snippet {idx} to be blocked!"
        assert any("Prohibited import" in v for v in violations)
    print("TEST 2 PASSED: All network egress imports blocked!")


def test_subprocess_and_shell_blocked():
    shell_snippets = [
        "import subprocess\nsubprocess.run(['ls', '-la'])",
        "import os\nos.system('rm -rf /')",
        "import os\nos.popen('whoami')",
        "import pty",
    ]
    for idx, snippet in enumerate(shell_snippets, 1):
        passed, violations = SecurityGuard.validate_code(snippet)
        assert passed is False, f"Expected shell snippet {idx} to be blocked!"
    print("TEST 3 PASSED: All subprocess and shell execution attempts blocked!")


def test_eval_exec_blocked():
    eval_snippets = [
        "eval('2 + 2')",
        "exec('import os')",
        "__import__('socket')",
    ]
    for idx, snippet in enumerate(eval_snippets, 1):
        passed, violations = SecurityGuard.validate_code(snippet)
        assert passed is False, f"Expected eval/exec snippet {idx} to be blocked!"
        assert any("Prohibited" in v for v in violations)
    print("TEST 4 PASSED: All eval/exec dynamic bytecode executions blocked!")


def test_syntax_error_handling():
    broken_code = "def invalid_syntax(:"
    passed, violations = SecurityGuard.validate_code(broken_code)
    assert passed is False
    assert any("Syntax Error" in v for v in violations)
    print("TEST 5 PASSED: Syntax errors properly captured and reported!")


if __name__ == "__main__":
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - SECURITY GUARD TESTS")
    print("=" * 60)
    test_safe_code()
    test_network_imports_blocked()
    test_subprocess_and_shell_blocked()
    test_eval_exec_blocked()
    test_syntax_error_handling()
    print("=" * 60)
    print("ALL SECURITY GUARD TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)
