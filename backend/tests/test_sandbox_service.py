import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.sandbox_service import SandboxService


def test_passing_code_and_tests():
    code = """
def add(a: int, b: int) -> int:
    return a + b

def multiply(a: int, b: int) -> int:
    return a * b
"""
    tests = """
import unittest
from solution import add, multiply

class TestMathOperations(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)
        self.assertEqual(add(-1, 1), 0)

    def test_multiply(self):
        self.assertEqual(multiply(4, 5), 20)
        self.assertEqual(multiply(0, 10), 0)
"""
    svc = SandboxService()
    res = svc.run_code_and_tests(code, tests, timeout_seconds=5.0)
    assert res.success is True, f"Expected tests to pass, but got stderr: {res.stderr}"
    assert res.exit_code == 0
    assert res.tests_total == 2
    assert res.tests_passed == 2
    assert res.tests_failed == 0
    print("TEST 1 PASSED: Passing code and tests executed cleanly in sandbox!")


def test_failing_tests_detection():
    code = """
def is_even(n: int) -> bool:
    return n % 2 == 1  # Bug! returns odd
"""
    tests = """
import unittest
from solution import is_even

class TestEven(unittest.TestCase):
    def test_is_even_true(self):
        self.assertTrue(is_even(4))

    def test_is_even_false(self):
        self.assertFalse(is_even(5))
"""
    svc = SandboxService()
    res = svc.run_code_and_tests(code, tests, timeout_seconds=5.0)
    assert res.success is False, "Expected buggy code to fail unit tests!"
    assert res.tests_failed > 0
    print("TEST 2 PASSED: Failing unit tests properly detected with error metrics!")


def test_timeout_protection():
    infinite_loop_code = """
def infinite_calculator():
    x = 0
    while True:
        x += 1
    return x
"""
    tests = """
import unittest
from solution import infinite_calculator

class TestTimeout(unittest.TestCase):
    def test_loop(self):
        infinite_calculator()
"""
    svc = SandboxService()
    res = svc.run_code_and_tests(infinite_loop_code, tests, timeout_seconds=1.5)
    assert res.success is False
    assert res.timed_out is True
    assert "TimeoutExpired" in (res.error_message or "")
    print("TEST 3 PASSED: Infinite loop timed out and was safely killed by sandbox!")


def test_security_violation_in_sandbox():
    malicious_code = """
import socket
def exfiltrate():
    s = socket.socket()
"""
    tests = "import unittest\nclass T(unittest.TestCase): pass"
    svc = SandboxService()
    res = svc.run_code_and_tests(malicious_code, tests)
    assert res.success is False
    assert "Security Policy Check Failed" in (res.error_message or "")
    print("TEST 4 PASSED: Security violation blocked prior to sandbox process spawn!")


if __name__ == "__main__":
    print("=" * 60)
    print("SOVEREIGN AI WORKBENCH - SANDBOX SERVICE TESTS")
    print("=" * 60)
    test_passing_code_and_tests()
    test_failing_tests_detection()
    test_timeout_protection()
    test_security_violation_in_sandbox()
    print("=" * 60)
    print("ALL SANDBOX SERVICE TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)
