import ast
import logging
from typing import List, Set, Tuple

logger = logging.getLogger("app.services.security_guard")

# Prohibited modules that could violate the air-gap, perform network egress, or execute arbitrary system commands
PROHIBITED_MODULES: Set[str] = {
    # Network & Egress
    "socket",
    "requests",
    "urllib",
    "urllib3",
    "http",
    "http.client",
    "http.server",
    "httpx",
    "aiohttp",
    "ftplib",
    "telnetlib",
    "smtplib",
    "poplib",
    "imaplib",
    "xmlrpc",
    "asyncio.streams",
    "websocket",
    "websockets",
    # Subprocess & Shell execution
    "subprocess",
    "os.system",
    "os.popen",
    "pty",
    "posix",
    "resource",
    # Low-level memory & dynamic execution
    "ctypes",
    "_ctypes",
    "multiprocessing",
    "threading",  # avoid thread-based resource exhaustion in sandbox
}

# Prohibited built-in functions
PROHIBITED_BUILTINS: Set[str] = {
    "eval",
    "exec",
    "compile",
    "__import__",
    "breakpoint",
}

# Prohibited dangerous attributes / functions on allowed modules
PROHIBITED_CALLS: Set[str] = {
    "os.system",
    "os.popen",
    "os.spawn",
    "os.exec",
    "os.fork",
    "os.kill",
    "os.remove",
    "os.unlink",
    "os.rmdir",
    "shutil.rmtree",
}


class SecurityViolation:
    def __init__(self, message: str, line_number: int = 0, node_type: str = ""):
        self.message = message
        self.line_number = line_number
        self.node_type = node_type

    def __str__(self) -> str:
        loc = f"Line {self.line_number}: " if self.line_number > 0 else ""
        return f"{loc}{self.message}"


class ASTSecurityVisitor(ast.NodeVisitor):
    """
    Traverses Python Abstract Syntax Trees (AST) to enforce strict air-gapped security policies.
    """

    def __init__(self):
        self.violations: List[SecurityViolation] = []

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            base_module = alias.name.split(".")[0]
            if base_module in PROHIBITED_MODULES or alias.name in PROHIBITED_MODULES:
                self.violations.append(
                    SecurityViolation(
                        f"Prohibited import '{alias.name}'. Air-gap policy forbids network or shell access.",
                        node.lineno,
                        "Import",
                    )
                )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module:
            base_module = node.module.split(".")[0]
            if base_module in PROHIBITED_MODULES or node.module in PROHIBITED_MODULES:
                self.violations.append(
                    SecurityViolation(
                        f"Prohibited import from '{node.module}'. Air-gap policy forbids network or shell access.",
                        node.lineno,
                        "ImportFrom",
                    )
                )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        # Check direct calls to prohibited builtins (e.g. eval(...), exec(...))
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name in PROHIBITED_BUILTINS:
                self.violations.append(
                    SecurityViolation(
                        f"Prohibited built-in call '{func_name}()'. Dynamic execution is disallowed.",
                        node.lineno,
                        "Call",
                    )
                )
        # Check attribute calls (e.g. os.system(...), subprocess.Popen(...))
        elif isinstance(node.func, ast.Attribute):
            full_attr = self._get_full_attribute_name(node.func)
            if full_attr in PROHIBITED_CALLS or any(full_attr.startswith(p) for p in PROHIBITED_MODULES):
                self.violations.append(
                    SecurityViolation(
                        f"Prohibited call '{full_attr}()'. System modification or network calls are disallowed.",
                        node.lineno,
                        "Call",
                    )
                )
        self.generic_visit(node)

    def _get_full_attribute_name(self, node: ast.AST) -> str:
        """Recursively resolve attribute access like os.path.exists or os.system."""
        if isinstance(node, ast.Attribute):
            prefix = self._get_full_attribute_name(node.value)
            return f"{prefix}.{node.attr}" if prefix else node.attr
        elif isinstance(node, ast.Name):
            return node.id
        return ""


class SecurityGuard:
    """
    Static Code Security & Policy Validator for the Sovereign Coding Agent.
    Validates that generated code adheres to strict air-gap and sandbox safety rules.
    """

    @classmethod
    def validate_code(cls, source_code: str) -> Tuple[bool, List[str]]:
        """
        Analyze Python code via AST parsing.
        Returns (passed, list_of_violation_messages).
        """
        if not source_code or not source_code.strip():
            return False, ["Source code is empty."]

        try:
            tree = ast.parse(source_code)
        except SyntaxError as e:
            return False, [f"Syntax Error at line {e.lineno}: {e.msg}"]
        except Exception as e:
            return False, [f"AST parse failure: {str(e)}"]

        visitor = ASTSecurityVisitor()
        visitor.visit(tree)

        if visitor.violations:
            violation_msgs = [str(v) for v in visitor.violations]
            logger.warning(f"Security policy violations detected: {violation_msgs}")

            try:
                from app.services.audit_logger import audit_logger
                audit_logger.record_event(
                    event_type="AST_POLICY_BLOCK",
                    severity="SECURITY_ALERT",
                    actor="ast_security_guard",
                    details={"violations": violation_msgs, "violation_count": len(violation_msgs)}
                )
            except Exception as err:
                logger.debug(f"Audit log emission skipped: {err}")

            return False, violation_msgs

        return True, []
