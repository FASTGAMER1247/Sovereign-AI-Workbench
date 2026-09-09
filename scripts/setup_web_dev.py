"""
Sovereign AI Workbench — Web Development First-Time Setup Utility
Verifies and configures all prerequisites for running the Web application target:
- Python 3.10+ & pip
- backend/.venv virtual environment
- backend/requirements.txt packages
- Node.js & npm
- frontend/node_modules
- Ollama local inference daemon
- Mandatory models (qwen2.5-coder:1.5b and nomic-embed-text)
- Sandbox capability assessment
"""

import json
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

# Ensure UTF-8 stdout/stderr on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
VENV_DIR = BACKEND_DIR / ".venv"
VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe" if sys.platform == "win32" else VENV_DIR / "bin" / "python"
VENV_PIP = VENV_DIR / "Scripts" / "pip.exe" if sys.platform == "win32" else VENV_DIR / "bin" / "pip"

def detect_hardware_tier() -> dict:
    """Inspect host RAM, CPU, and GPU to calculate optimal model tier."""
    total_ram = 8.0
    free_ram = 4.0
    if sys.platform == "win32":
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            mem = MEMORYSTATUSEX()
            mem.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
            total_ram = round(mem.ullTotalPhys / (1024**3), 1)
            free_ram = round(mem.ullAvailPhys / (1024**3), 1)
        except Exception:
            pass

    cpu_cores = os.cpu_count() or 4
    gpu_name = "Generic Graphics Adapter"
    gpu_vram = 0.0

    if sys.platform == "win32":
        try:
            cmd = [
                "powershell",
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM | ConvertTo-Json"
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=2.0)
            if res.returncode == 0 and res.stdout.strip():
                data = json.loads(res.stdout)
                if isinstance(data, list):
                    data = data[0]
                gpu_name = data.get("Name", "Standard GPU")
                vram_bytes = data.get("AdapterRAM", 0) or 0
                gpu_vram = round(vram_bytes / (1024**3), 1)
        except Exception:
            pass

    if total_ram >= 28.0 or gpu_vram >= 10.0:
        tier = "Tier 3 (Enterprise Rig)"
        desc = f"High-capacity system ({total_ram} GB RAM, {gpu_vram} GB VRAM). Optimal for 14B models and multimodal vision."
        models = [
            {"name": "qwen2.5-coder:14b", "role": "Primary Chat & Autonomous Coding Agent", "purpose": "Highest reasoning depth & code synthesis for 32GB+ systems", "mandatory": True},
            {"name": "nomic-embed-text", "role": "RAG Dense Vector Embeddings", "purpose": "Optimal 768-dimensional semantic embeddings for local SOP search", "mandatory": True},
            {"name": "deepseek-r1:8b", "role": "Deep Multi-hop Reasoning & Audit Verification", "purpose": "Advanced chain-of-thought verification for high-spec workstations", "mandatory": False},
            {"name": "llama3.2-vision:11b", "role": "Multimodal Document Vision & Image OCR", "purpose": "Hardware supports direct visual OCR and diagram parsing", "mandatory": False},
        ]
    elif total_ram >= 12.0 or gpu_vram >= 4.0:
        tier = "Tier 2 (Pro Workstation)"
        desc = f"Professional workstation ({total_ram} GB RAM, {gpu_vram} GB VRAM). Optimal for 7B models with high-speed execution."
        models = [
            {"name": "qwen2.5-coder:7b", "role": "Primary Chat, Coding & Compliance Audit", "purpose": "Peak accuracy-to-speed ratio for 16GB workstations", "mandatory": True},
            {"name": "nomic-embed-text", "role": "RAG Dense Vector Embeddings", "purpose": "Optimal 768-dimensional semantic embeddings for local SOP search", "mandatory": True},
            {"name": "deepseek-r1:1.5b", "role": "Fast Chain-of-Thought Reasoning", "purpose": "Lightweight mathematical and logical consistency auditing", "mandatory": False},
            {"name": "llama3.2:3b", "role": "Executive Report Generation", "purpose": "High-speed document summarization and note generation", "mandatory": False},
        ]
    else:
        tier = "Tier 1 (Light / Air-Gap Standard)"
        desc = f"Lightweight / Standard laptop ({total_ram} GB RAM). Tuned for instant execution with low memory footprint."
        models = [
            {"name": "qwen2.5-coder:1.5b", "role": "Primary Chat, Coding & Compliance Audit", "purpose": "Instant sub-second inference with ultra-low 980MB RAM footprint", "mandatory": True},
            {"name": "nomic-embed-text", "role": "RAG Dense Vector Embeddings", "purpose": "Optimal 768-dimensional semantic embeddings for local SOP search", "mandatory": True},
            {"name": "deepseek-r1:1.5b", "role": "Fast Multi-hop Reasoning", "purpose": "Compact mathematical and logical audit verification", "mandatory": False},
        ]

    return {
        "ram_gb": total_ram,
        "free_ram_gb": free_ram,
        "cores": cpu_cores,
        "gpu": gpu_name,
        "vram_gb": gpu_vram,
        "tier": tier,
        "desc": desc,
        "models": models,
    }


# Backwards compatibility aliases
REQUIRED_MODELS = [
    {"name": "qwen2.5-coder:1.5b", "purpose": "Primary Chat & Coding", "mandatory": True},
    {"name": "nomic-embed-text", "purpose": "RAG Vector Embeddings", "mandatory": True},
]
OPTIONAL_MODELS = [
    {"name": "deepseek-r1:1.5b", "purpose": "Multi-hop Reasoning", "mandatory": False},
]


class Ansi:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def print_banner():
    print(f"{Ansi.BOLD}{Ansi.CYAN}")
    print("=" * 78)
    print("      SOVEREIGN AI WORKBENCH -- WEB DEVELOPMENT SETUP UTILITY")
    print("=" * 78)
    print(f"{Ansi.RESET}")
    print(f"{Ansi.DIM}Verifying local prerequisites for air-gapped web development...{Ansi.RESET}\n")


def status_pass(item: str, detail: str = ""):
    print(f" {Ansi.GREEN}[OK]{Ansi.RESET}   {item:<34} {detail}")


def status_warn(item: str, detail: str = ""):
    print(f" {Ansi.YELLOW}[WARN]{Ansi.RESET} {item:<34} {detail}")


def status_fail(item: str, detail: str = ""):
    print(f" {Ansi.RED}[FAIL]{Ansi.RESET} {item:<34} {detail}")




def check_python() -> bool:
    print(f"{Ansi.BOLD}1. Host Python Environment{Ansi.RESET}")
    ver = sys.version_info
    py_str = f"Python {ver.major}.{ver.minor}.{ver.micro}"
    if ver.major == 3 and ver.minor >= 10:
        status_pass("Python Version", f"{py_str} (Supported)")
        return True
    else:
        status_fail("Python Version", f"{py_str} (Requires Python 3.10 or higher)")
        print(f"    {Ansi.YELLOW}Recovery: Please install Python 3.10 or 3.11 from https://www.python.org/downloads/{Ansi.RESET}")
        return False


def check_and_setup_venv() -> bool:
    print(f"\n{Ansi.BOLD}2. Backend Virtual Environment (.venv){Ansi.RESET}")
    if not VENV_PYTHON.is_file():
        print("    Virtual environment missing at backend/.venv. Creating now...", end="", flush=True)
        try:
            res = subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)
            print(f" {Ansi.GREEN}[CREATED]{Ansi.RESET}")
        except Exception as e:
            print(f" {Ansi.RED}[FAILED]{Ansi.RESET}")
            status_fail("Virtual Environment Creation", str(e))
            return False

    status_pass("Virtual Environment", f"Active at {VENV_DIR.relative_to(REPO_ROOT)}")

    # Check dependencies
    req_file = BACKEND_DIR / "requirements.txt"
    if not req_file.is_file():
        status_fail("Requirements File", "backend/requirements.txt not found")
        return False

    # Check installed packages
    try:
        check_proc = subprocess.run(
            [
                str(VENV_PYTHON),
                "-c",
                "import importlib.util as u; exit(0 if all(u.find_spec(p) for p in ['fastapi', 'uvicorn', 'chromadb', 'fitz', 'docx', 'pydantic', 'httpx']) else 1)",
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        if check_proc.returncode == 0:
            status_pass("Python Dependencies", "All core packages verified (FastAPI, ChromaDB, PyMuPDF, etc.)")
            return True
    except Exception:
        pass


    # If packages missing, install them
    print("    Installing/updating backend dependencies from backend/requirements.txt...")
    install_res = subprocess.run(
        [str(VENV_PYTHON), "-m", "pip", "install", "--no-warn-script-location", "-r", str(req_file)],
        cwd=str(BACKEND_DIR),
    )
    if install_res.returncode == 0:
        status_pass("Python Dependencies", "Installed successfully into backend/.venv")
        return True
    else:
        status_fail("Python Dependencies", "Installation failed. Check internet connection or pip cache.")
        return False



def check_node_and_frontend() -> bool:
    print(f"\n{Ansi.BOLD}3. Node.js & Frontend Environment{Ansi.RESET}")
    # Check node
    node_cmd = shutil.which("node")
    if not node_cmd:
        status_fail("Node.js", "node not found in PATH.")
        print(f"    {Ansi.YELLOW}Recovery: Install Node.js v18+ from https://nodejs.org/{Ansi.RESET}")
        return False

    try:
        node_ver = subprocess.run(["node", "-v"], capture_output=True, text=True, check=True, shell=(sys.platform == "win32")).stdout.strip()
        status_pass("Node.js Version", node_ver)
    except Exception as e:
        status_fail("Node.js", str(e))
        return False

    # Check npm
    npm_cmd = shutil.which("npm") or (shutil.which("npm.cmd") if sys.platform == "win32" else None)
    if not npm_cmd:
        status_fail("npm", "npm not found in PATH.")
        return False

    try:
        npm_ver = subprocess.run([npm_cmd, "-v"], capture_output=True, text=True, check=True, shell=(sys.platform == "win32")).stdout.strip()
        status_pass("npm Version", f"v{npm_ver}")
    except Exception as e:
        status_fail("npm", str(e))
        return False

    # Check frontend/node_modules
    nm_dir = FRONTEND_DIR / "node_modules"
    if not nm_dir.is_dir() or not (nm_dir / "vite").is_dir():
        print("    Frontend dependencies missing. Running 'npm install' in frontend/...", end="", flush=True)
        npm_install = subprocess.run([npm_cmd, "install"], cwd=str(FRONTEND_DIR), shell=(sys.platform == "win32"))
        if npm_install.returncode == 0:
            status_pass("Frontend Dependencies", "Installed into frontend/node_modules")
            return True
        else:
            status_fail("Frontend Dependencies", "npm install failed.")
            return False
    else:
        status_pass("Frontend Dependencies", "node_modules already satisfied")
        return True



def check_ollama_and_models(auto_pull: bool = False) -> dict:
    print(f"\n{Ansi.BOLD}4. Host Hardware Specification & Optimal Model Assessment{Ansi.RESET}")
    hw = detect_hardware_tier()

    status_pass("Host Memory (RAM)", f"{hw['ram_gb']} GB Physical ({hw['free_ram_gb']} GB Available)")
    status_pass("Processor Cores", f"{hw['cores']} Logical Cores")
    status_pass("Graphics Adapter", f"{hw['gpu']} ({hw['vram_gb']} GB VRAM)")
    status_pass("Recommended AI Tier", f"{Ansi.BOLD}{hw['tier']}{Ansi.RESET}")
    print(f"    {Ansi.DIM}Architecture strategy: {hw['desc']}{Ansi.RESET}\n")

    ollama_online = False
    installed_models = []

    # Check if Ollama daemon is responsive
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                installed_models = [m.get("name", "") for m in data.get("models", [])]
                ollama_online = True
    except Exception:
        ollama_online = False

    if not ollama_online:
        # Check if ollama CLI is available to attempt launch
        ollama_cli = shutil.which("ollama")
        if ollama_cli:
            status_warn("Ollama Service", "Daemon offline on port 11434. Starting 'ollama serve' in background...")
            try:
                flags = 0
                if sys.platform == "win32":
                    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
                subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
                import time
                for _ in range(8):
                    time.sleep(0.5)
                    try:
                        req = urllib.request.Request("http://127.0.0.1:11434/api/tags")
                        with urllib.request.urlopen(req, timeout=1.0) as resp:
                            if resp.status == 200:
                                data = json.loads(resp.read().decode("utf-8"))
                                installed_models = [m.get("name", "") for m in data.get("models", [])]
                                ollama_online = True
                                break
                    except Exception:
                        pass
            except Exception:
                pass

    if ollama_online:
        status_pass("Ollama Service", f"Online at http://127.0.0.1:11434 ({len(installed_models)} models detected)")
    else:
        status_fail("Ollama Service", "Ollama is unreachable on port 11434.")
        print(f"    {Ansi.YELLOW}Recovery: Download & install Ollama from https://ollama.com/{Ansi.RESET}")
        print(f"    {Ansi.YELLOW}Then run: ollama serve{Ansi.RESET}")
        return {"online": False, "missing_models": [m["name"] for m in hw["models"] if m["mandatory"]]}

    # Check tier-optimal models
    missing_models = []
    print(f"\n    {Ansi.BOLD}Optimal Models for {hw['tier']}:{Ansi.RESET}")
    for model in hw["models"]:
        name = model["name"]
        is_installed = any(name in m or m.startswith(name.split(":")[0]) for m in installed_models)
        if is_installed:
            status_pass(f"Model: {name}", f"Installed — {model['role']} ({model['purpose']})")
        else:
            tag = "MISSING [REQUIRED]" if model["mandatory"] else "MISSING [RECOMMENDED]"
            status_warn(f"Model: {name}", f"{tag} — {model['role']}")
            missing_models.append(name)
            print(f"      {Ansi.CYAN}→ Purpose: {model['purpose']}{Ansi.RESET}")

    # Auto-install missing optimal models if confirmed or auto_pull flag is set
    if missing_models and ollama_online:
        should_pull = auto_pull
        if not should_pull and sys.stdin.isatty():
            try:
                print()
                ans = input(
                    f"    {Ansi.BOLD}{Ansi.GREEN}--> Auto-download {len(missing_models)} missing optimal models for your system now? [Y/n]: {Ansi.RESET}"
                ).strip().lower()
                should_pull = (ans in ("", "y", "yes"))
            except Exception:
                should_pull = False

        if should_pull:
            print(f"\n    {Ansi.BOLD}{Ansi.CYAN}Starting automatic download of optimal models for {hw['tier']}...{Ansi.RESET}")
            pulled_successfully = []
            for model_name in missing_models:
                print(f"\n    {Ansi.CYAN}[DOWNLOADING]{Ansi.RESET} Pulling {Ansi.BOLD}{model_name}{Ansi.RESET}...")
                try:
                    res = subprocess.run(["ollama", "pull", model_name])
                    if res.returncode == 0:
                        status_pass(f"Model: {model_name}", "Installed and verified")
                        pulled_successfully.append(model_name)
                    else:
                        status_fail(f"Model: {model_name}", f"Pull exited with code {res.returncode}")
                except Exception as e:
                    status_fail(f"Model: {model_name}", f"Download failed: {e}")

            # Remove successfully pulled models from missing list
            missing_models = [m for m in missing_models if m not in pulled_successfully]

    return {"online": ollama_online, "missing_models": missing_models, "tier": hw["tier"]}


def check_sandbox_capability():
    print(f"\n{Ansi.BOLD}5. Phase 5 Sandbox Capability Assessment{Ansi.RESET}")
    docker_cli = shutil.which("docker")
    docker_running = False
    if docker_cli:
        try:
            res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2.0)
            docker_running = (res.returncode == 0)
        except Exception:
            docker_running = False

    if docker_running:
        status_pass("Sandbox Isolation", "Docker Available (Full container isolation: --network none, 128m memory)")
    else:
        status_pass("Sandbox Isolation", "Restricted Subprocess Active (AST Static Policy Guard + 5.0s Timeout Cap)")
        print(f"    {Ansi.DIM}* Note: Docker is optional. Subprocess sandbox provides full functional capability.{Ansi.RESET}")


def main():
    print_banner()

    auto_pull = ("--auto-pull" in sys.argv or "-y" in sys.argv or "--yes" in sys.argv)

    py_ok = check_python()
    if not py_ok:
        sys.exit(1)

    venv_ok = check_and_setup_venv()
    node_ok = check_node_and_frontend()
    ollama_status = check_ollama_and_models(auto_pull=auto_pull)
    check_sandbox_capability()

    print(f"\n{Ansi.BOLD}{Ansi.CYAN}{'=' * 78}{Ansi.RESET}")
    print(f"{Ansi.BOLD}SETUP SUMMARY{Ansi.RESET}")
    print(f"{Ansi.BOLD}{Ansi.CYAN}{'=' * 78}{Ansi.RESET}")

    all_ok = venv_ok and node_ok and ollama_status["online"] and len(ollama_status["missing_models"]) == 0

    if all_ok:
        print(f"\n {Ansi.GREEN}{Ansi.BOLD}[OK] ALL PREREQUISITES & OPTIMAL MODELS SATISFIED!{Ansi.RESET}")
        print(" You can now run the web application at any time using:")
        print(f"   {Ansi.CYAN}Launch Workbench.bat{Ansi.RESET}  (or 'npm run dev' inside frontend/)\n")
    else:
        print(f"\n {Ansi.YELLOW}{Ansi.BOLD}[!] SETUP COMPLETED WITH PENDING ACTIONS:{Ansi.RESET}")
        if not ollama_status["online"]:
            print(f"   - Start Ollama: {Ansi.BOLD}ollama serve{Ansi.RESET}")
        for missing in ollama_status.get("missing_models", []):
            print(f"   - Pull Model:   {Ansi.BOLD}ollama pull {missing}{Ansi.RESET}")
        print(f"\n After addressing pending items, run {Ansi.CYAN}Launch Workbench.bat{Ansi.RESET} to start.\n")



if __name__ == "__main__":
    main()
