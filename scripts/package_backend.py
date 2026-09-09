"""
Sovereign AI Workbench — Backend Packaging Pipeline
Packages the FastAPI backend into a self-contained, standalone Windows executable
(sovereign-backend.exe) for production distribution with the Tauri desktop installer.

Features:
- Bundles Python runtime and all backend dependencies (FastAPI, Uvicorn, ChromaDB, etc.)
- Removes any dependency on developer local virtualenvs or absolute file paths.
- Stages the resulting executable into:
    frontend/src-tauri/resources/backend/sovereign-backend.exe
    frontend/src-tauri/binaries/sovereign-backend-x86_64-pc-windows-msvc.exe
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
SRC_TAURI_DIR = FRONTEND_DIR / "src-tauri"
RESOURCES_DIR = SRC_TAURI_DIR / "resources" / "backend"
BINARIES_DIR = SRC_TAURI_DIR / "binaries"

# Venv Python interpreter
VENV_PYTHON = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
if not VENV_PYTHON.is_file():
    VENV_PYTHON = Path(sys.executable)


def run_cmd(cmd: list[str], cwd: Path) -> int:
    print(f"--> Running: {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    return result.returncode


def ensure_pyinstaller():
    print("[1/4] Ensuring PyInstaller is installed in packaging environment...")
    res = subprocess.run([str(VENV_PYTHON), "-m", "pip", "show", "pyinstaller"], capture_output=True)
    if res.returncode != 0:
        print("--> PyInstaller not found. Installing into virtual environment...")
        install_res = run_cmd([str(VENV_PYTHON), "-m", "pip", "install", "pyinstaller"], BACKEND_DIR)
        if install_res != 0:
            raise RuntimeError("Failed to install PyInstaller into backend environment.")
    else:
        print("--> PyInstaller is ready.")


def build_standalone_executable():
    print("\n[2/5] Compiling sovereign-backend.exe via PyInstaller...")
    entrypoint = BACKEND_DIR / "entrypoint.py"

    hidden_imports = [
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespans",
        "uvicorn.lifespans.on",
        "uvicorn.lifespans.off",
        "app",
        "app.main",
        "app.config",
        "app.api.routes",
        "app.models.schemas",
        "app.models.ollama_provider",
        "app.services.model_service",
        "app.services.rag_service",
        "app.services.sandbox_service",
        "app.services.security_guard",
        "app.services.sovereignty_service",
        "app.services.audit_logger",
        "app.services.coding_agent",
        "app.services.document_service",
        "app.services.docx_service",
        "app.services.hardware_service",
        "app.services.embedding_service",
        "app.services.knowledge_service",
        "app.services.retrieval_service",
        "app.services.router_service",
        "app.services.workflow_engine",
        "app.services.vector_store",
        "app.services.vector_store.chroma_store",
        "app.services.embedding.ollama_embedding",
        "chromadb",
        "chromadb.telemetry.product.posthog",
        "pydantic",
        "pydantic_settings",
        "fitz",
        "docx",
    ]

    cmd = [
        str(VENV_PYTHON),
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--name",
        "sovereign-backend",
        "--collect-all",
        "chromadb",
        "--paths",
        str(BACKEND_DIR),
    ]

    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])

    cmd.append(str(entrypoint))

    ret = run_cmd(cmd, BACKEND_DIR)
    if ret != 0:
        raise RuntimeError("PyInstaller build for sovereign-backend failed.")


def build_sandbox_runner():
    print("\n[3/5] Compiling sovereign-sandbox-runner.exe via PyInstaller...")
    runner_script = BACKEND_DIR / "sandbox_runner.py"

    cmd = [
        str(VENV_PYTHON),
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--name",
        "sovereign-sandbox-runner",
        "--paths",
        str(BACKEND_DIR),
        str(runner_script),
    ]

    ret = run_cmd(cmd, BACKEND_DIR)
    if ret != 0:
        raise RuntimeError("PyInstaller build for sovereign-sandbox-runner failed.")


def stage_for_tauri():
    print("\n[4/5] Staging production backend & sandbox runner for Tauri 2 packaging...")
    dist_folder = BACKEND_DIR / "dist" / "sovereign-backend"
    runner_exe = BACKEND_DIR / "dist" / "sovereign-sandbox-runner.exe"

    RESOURCES_DIR.mkdir(parents=True, exist_ok=True)
    BINARIES_DIR.mkdir(parents=True, exist_ok=True)

    target_res = RESOURCES_DIR / "sovereign-backend"
    if target_res.exists():
        shutil.rmtree(target_res)

    print(f"--> Copying {dist_folder} to {target_res}...")
    shutil.copytree(dist_folder, target_res)

    # Place direct executable in resources/backend
    shutil.copy2(dist_folder / "sovereign-backend.exe", RESOURCES_DIR / "sovereign-backend.exe")

    # Place sandbox runner inside target_res and directly in resources/backend
    if runner_exe.is_file():
        shutil.copy2(runner_exe, target_res / "sovereign-sandbox-runner.exe")
        shutil.copy2(runner_exe, RESOURCES_DIR / "sovereign-sandbox-runner.exe")
        print(f"--> Staged sandbox runner: {target_res / 'sovereign-sandbox-runner.exe'}")

    # Place sidecar target
    sidecar_target = BINARIES_DIR / "sovereign-backend-x86_64-pc-windows-msvc.exe"
    shutil.copy2(dist_folder / "sovereign-backend.exe", sidecar_target)
    print(f"--> Created sidecar binary: {sidecar_target}")


def verify_bundle():
    print("\n[5/5] Verifying packaged binaries...")
    exe = RESOURCES_DIR / "sovereign-backend.exe"
    runner = RESOURCES_DIR / "sovereign-sandbox-runner.exe"

    if not exe.is_file():
        raise FileNotFoundError(f"Packaged backend executable missing at {exe}")
    size_mb = exe.stat().st_size / (1024 * 1024)
    print(f"--> SUCCESS: Standalone backend exists at {exe} ({size_mb:.1f} MB)")

    if not runner.is_file():
        raise FileNotFoundError(f"Packaged sandbox runner missing at {runner}")
    runner_size_mb = runner.stat().st_size / (1024 * 1024)
    print(f"--> SUCCESS: Standalone sandbox runner exists at {runner} ({runner_size_mb:.1f} MB)")
    print("--> All production binaries staged and ready for Tauri packaging!")


if __name__ == "__main__":
    print("================================================================")
    print(" Sovereign AI Workbench — Backend Standalone Packaging Pipeline")
    print("================================================================")
    try:
        ensure_pyinstaller()
        build_standalone_executable()
        build_sandbox_runner()
        stage_for_tauri()
        verify_bundle()
        print("\n Packaging process completed successfully!")
    except Exception as e:
        print(f"\n [ERROR] Packaging failed: {e}")
        sys.exit(1)
