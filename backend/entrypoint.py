"""
Sovereign AI Workbench — Standalone Backend Entrypoint
Allows running the FastAPI backend as a compiled standalone executable (PyInstaller)
or direct Python invocation without relying on shell uvicorn commands.
"""
import os
import sys
import argparse
import uvicorn

# Ensure the app package is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if getattr(sys, "frozen", False):
    # PyInstaller bundle directory
    BASE_DIR = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.main import app


def _watch_parent(parent_pid: int):
    """Monitor parent desktop process; exit automatically when parent terminates."""
    try:
        if sys.platform == "win32":
            import ctypes
            kernel32 = ctypes.windll.kernel32
            handle = kernel32.OpenProcess(0x00100000, False, parent_pid)
            if handle:
                kernel32.WaitForSingleObject(handle, 0xFFFFFFFF)
                kernel32.CloseHandle(handle)
                os._exit(0)
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Sovereign AI Workbench Backend")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port number (default: 8000)")
    parser.add_argument("--workers", type=int, default=1, help="Worker count")
    parser.add_argument("--parent-pid", type=int, default=0, help="Parent process ID to monitor")
    args, _ = parser.parse_known_args()

    if args.parent_pid > 0:
        import threading
        t = threading.Thread(target=_watch_parent, args=(args.parent_pid,), daemon=True)
        t.start()

    uvicorn.run(app, host=args.host, port=args.port, log_level="info", access_log=False)


import multiprocessing

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
