"""
Sovereign AI Workbench — Unified One-Click Launcher
Automatically manages local Ollama inference, FastAPI backend, and Vite frontend.
Performs health probes, opens the default web browser, and provides clean shutdown.
"""

import atexit
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"

# Python interpreter in virtual environment
VENV_PYTHON = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
if not VENV_PYTHON.is_file():
    VENV_PYTHON = REPO_ROOT / ".venv" / "Scripts" / "python.exe"
if not VENV_PYTHON.is_file():
    VENV_PYTHON = Path(sys.executable)

PROCS: list[subprocess.Popen] = []
CLEANED_UP = False


def print_banner():
    banner = r"""
================================================================================
    _____                                _             ___    ____ 
   / ___/ ____  _   __ ___   _____ ___  (_)____ _ ____/   |  /  _/ 
   \__ \ / __ \| | / // _ \ / ___// _ \/ // __ `// __  /| |  / /   
  ___/ // /_/ /| |/ //  __// /   /  __/ // /_/ // / / ___ |_/ /    
 /____/ \____/ |___/ \___//_/    \___//_/ \__, //_/ /_/  |_/___/    
                                         /____/                    
                  AIR-GAPPED AGENTIC WORKBENCH
================================================================================
"""
    print(banner)


def is_port_bound(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a TCP port is currently listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        result = sock.connect_ex((host, port))
        return result == 0


def probe_url(url: str, timeout: float = 0.8) -> bool:
    """Check if an HTTP endpoint returns a valid response."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "SovereignLauncher/1.0"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status in (200, 301, 302, 304)
    except Exception:
        return False


def ensure_ollama_running():
    """Ensure Ollama local server is running."""
    print(" [*] [1/4] Checking Local Ollama Inference Engine...", end="", flush=True)
    if probe_url("http://127.0.0.1:11434/api/tags", timeout=1.0):
        print(" [ONLINE]")
        return True

    print(" [OFFLINE, starting...]", end="", flush=True)
    try:
        # Launch ollama serve in detached mode
        creation_flags = 0
        if sys.platform == "win32":
            creation_flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creation_flags,
        )

        for _ in range(12):
            time.sleep(0.5)
            if probe_url("http://127.0.0.1:11434/api/tags", timeout=0.8):
                print(" [ONLINE]")
                return True

        print(" [WARNING: Ollama not responsive on port 11434. Local AI calls will fail until started.]")
        return False
    except Exception as exc:
        print(f" [WARNING: Could not auto-launch Ollama: {exc}]")
        return False


def kill_proc_tree(pid: int):
    """Safely terminate a Windows process and all its children."""
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            pass
    else:
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            pass


def cleanup():
    """Terminate all spawned child processes."""
    global CLEANED_UP
    if CLEANED_UP:
        return
    CLEANED_UP = True
    print("\n [!] Stopping Sovereign AI Workbench services...")
    for proc in PROCS:
        if proc and proc.poll() is None:
            kill_proc_tree(proc.pid)
    print(" [✓] All workbench services stopped cleanly.\n")


def start_backend():
    """Start the FastAPI backend server or detect existing instance."""
    print(" [*] [2/4] Initializing FastAPI Core Backend...", end="", flush=True)
    if probe_url("http://127.0.0.1:8000/api/health", timeout=1.0):
        print(" [ALREADY RUNNING on 8000]")
        return None

    # Start uvicorn
    cmd = [
        str(VENV_PYTHON),
        "-u",
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
    ]

    creation_flags = 0
    if sys.platform == "win32":
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

    proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=creation_flags,
    )
    PROCS.append(proc)

    # Wait for backend to report healthy
    for _ in range(30):
        time.sleep(0.4)
        if probe_url("http://127.0.0.1:8000/api/health", timeout=0.8):
            print(" [READY on 8000]")
            return proc

    print(" [STARTED]")
    return proc


def start_frontend():
    """Start the Vite frontend dev server or detect existing instance."""
    print(" [*] [3/4] Initializing Vite Client Interface...", end="", flush=True)
    if probe_url("http://127.0.0.1:5173/", timeout=1.0):
        print(" [ALREADY RUNNING on 5173]")
        return None

    # Start vite
    cmd = ["cmd.exe", "/c", "npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]

    creation_flags = 0
    if sys.platform == "win32":
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP

    proc = subprocess.Popen(
        cmd,
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=creation_flags,
    )
    PROCS.append(proc)

    # Wait for frontend to report healthy
    for _ in range(30):
        time.sleep(0.4)
        if probe_url("http://127.0.0.1:5173/", timeout=0.8):
            print(" [READY on 5173]")
            return proc

    print(" [STARTED]")
    return proc


def main():
    print_banner()

    atexit.register(cleanup)
    signal.signal(signal.SIGINT, lambda sig, frame: sys.exit(0))
    signal.signal(signal.SIGTERM, lambda sig, frame: sys.exit(0))

    # 1. Ollama check
    ensure_ollama_running()

    # 2. Start Backend
    backend_proc = start_backend()

    # 3. Start Frontend
    frontend_proc = start_frontend()

    target_url = "http://127.0.0.1:5173"

    # 4. Open default browser
    print(" [*] [4/4] Opening Sovereign Workbench in default browser...", end="", flush=True)
    time.sleep(1.0)
    try:
        webbrowser.open(target_url, new=2)
        print(" [SUCCESS]")
    except Exception as exc:
        print(f" [FAILED: {exc}]")

    print("\n" + "=" * 80)
    print(f"  SOVEREIGN AI WORKBENCH IS ACTIVE!")
    print(f"  Access URL:   {target_url}")
    print(f"  API Endpoint: http://127.0.0.1:8000/api/health")
    print(f"  Architecture: 100% On-Premise · Air-Gapped · Zero External Telemetry")
    print("=" * 80)
    print("\n  >> Press CTRL+C in this console to safely shut down all services <<\n")

    # Monitor loop
    try:
        while True:
            time.sleep(1.0)
            # Check if any spawned child died prematurely
            if backend_proc and backend_proc.poll() is not None:
                print("\n [!] Backend process terminated unexpectedly.")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print("\n [!] Frontend process terminated unexpectedly.")
                break
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    main()
