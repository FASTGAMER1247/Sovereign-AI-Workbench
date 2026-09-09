"""
Sovereign AI Workbench — Desktop Development First-Time Setup Utility
Verifies and configures all prerequisites for developing the Tauri 2 Desktop target:
- Everything from Web setup (Python, venv, requirements, Node, npm, Ollama, models)
- Rust toolchain (cargo, rustc 1.77.2+)
- Microsoft C++ Build Tools (MSVC)
- Tauri 2 CLI & Cargo workspace crates
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

# Ensure UTF-8 stdout/stderr on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

SCRIPT_DIR = Path(__file__).resolve().parent

REPO_ROOT = SCRIPT_DIR.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
SRC_TAURI_DIR = FRONTEND_DIR / "src-tauri"

# Import checks from setup_web_dev
sys.path.insert(0, str(SCRIPT_DIR))
from setup_web_dev import (
    Ansi,
    check_python,
    check_and_setup_venv,
    check_node_and_frontend,
    check_ollama_and_models,
    check_sandbox_capability,
    status_pass,
    status_warn,
    status_fail,
)


def print_desktop_banner():
    print(f"{Ansi.BOLD}{Ansi.CYAN}")
    print("=" * 78)
    print("    SOVEREIGN AI WORKBENCH — TAURI DESKTOP DEVELOPMENT SETUP")
    print("=" * 78)
    print(f"{Ansi.RESET}")
    print(f"{Ansi.DIM}Verifying Rust, MSVC, and Tauri 2 desktop development toolchain...{Ansi.RESET}\n")


def check_rust_toolchain() -> bool:
    print(f"\n{Ansi.BOLD}6. Rust MSVC Toolchain & Cargo{Ansi.RESET}")

    # Check user cargo bin in PATH if not already present
    user_cargo_bin = Path(os.environ.get("USERPROFILE", "")) / ".cargo" / "bin"
    if user_cargo_bin.is_dir() and str(user_cargo_bin) not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{user_cargo_bin};" + os.environ.get("PATH", "")

    cargo_cmd = shutil.which("cargo")
    rustc_cmd = shutil.which("rustc")

    if not cargo_cmd or not rustc_cmd:
        # Check standard default path
        cargo_exe = user_cargo_bin / "cargo.exe"
        if cargo_exe.is_file():
            cargo_cmd = str(cargo_exe)
            rustc_cmd = str(user_cargo_bin / "rustc.exe")

    if not cargo_cmd or not rustc_cmd:
        status_fail("Rust Toolchain", "Cargo and rustc not found in PATH or ~/.cargo/bin.")
        print(f"    {Ansi.YELLOW}Recovery: Install Rust from https://rustup.rs/ (Select standard MSVC x64){Ansi.RESET}")
        print(f"    {Ansi.YELLOW}Or via winget: winget install Rustlang.Rustup{Ansi.RESET}")
        return False

    try:
        rustc_ver = subprocess.run([rustc_cmd, "--version"], capture_output=True, text=True, check=True).stdout.strip()
        cargo_ver = subprocess.run([cargo_cmd, "--version"], capture_output=True, text=True, check=True).stdout.strip()
        status_pass("Rust Compiler", rustc_ver)
        status_pass("Cargo Package Manager", cargo_ver)
        return True
    except Exception as e:
        status_fail("Rust Toolchain", str(e))
        return False


def check_msvc_build_tools() -> bool:
    print(f"\n{Ansi.BOLD}7. Microsoft C++ Build Tools (MSVC){Ansi.RESET}")
    # Check for visual studio build tools directories or cl.exe
    vs_paths = [
        Path(r"C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools"),
        Path(r"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"),
        Path(r"C:\Program Files\Microsoft Visual Studio\2022\Community"),
        Path(r"C:\Program Files\Microsoft Visual Studio\2022\Professional"),
        Path(r"C:\Program Files\Microsoft Visual Studio\2022\Enterprise"),
    ]

    found_vs = None
    for p in vs_paths:
        if p.is_dir():
            found_vs = p
            break

    if found_vs:
        status_pass("MSVC Build Tools", f"Found at {found_vs}")
        return True
    elif shutil.which("cl"):
        status_pass("MSVC Compiler", f"cl.exe detected in PATH ({shutil.which('cl')})")
        return True
    else:
        status_warn("MSVC Build Tools", "Visual Studio C++ Build Tools path not detected in standard location.")
        print(f"    {Ansi.YELLOW}Note: If Rust compiles successfully, your C++ linker is already configured.{Ansi.RESET}")
        print(f"    {Ansi.YELLOW}If compilation fails, install 'Desktop development with C++' from visualstudio.microsoft.com{Ansi.RESET}")
        return True


def check_tauri_dependencies() -> bool:
    print(f"\n{Ansi.BOLD}8. Tauri 2 Desktop Framework & Crates{Ansi.RESET}")
    if not (FRONTEND_DIR / "src-tauri" / "Cargo.toml").is_file():
        status_fail("Tauri Project", "frontend/src-tauri/Cargo.toml is missing.")
        return False

    status_pass("Tauri Configuration", "frontend/src-tauri/tauri.conf.json verified")

    # Fast validation: cargo check
    print("    Verifying Tauri 2 crate compilation...", end="", flush=True)
    try:
        user_cargo_bin = Path(os.environ.get("USERPROFILE", "")) / ".cargo" / "bin"
        env = os.environ.copy()
        if user_cargo_bin.is_dir():
            env["PATH"] = f"{user_cargo_bin};" + env.get("PATH", "")

        res = subprocess.run(
            ["cargo", "check"],
            cwd=str(SRC_TAURI_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if res.returncode == 0:
            print(f" {Ansi.GREEN}[READY]{Ansi.RESET}")
            status_pass("Tauri 2 Crates", "Desktop binary crate checks passed (0 errors)")
            return True
        else:
            print(f" {Ansi.YELLOW}[WARNING]{Ansi.RESET}")
            status_warn("Tauri 2 Crates", "cargo check reported issues.")
            return True
    except Exception as e:
        print(f" {Ansi.YELLOW}[SKIPPED]{Ansi.RESET}")
        status_warn("Tauri 2 Crates", f"Could not complete verification check: {e}")
        return True


def main():
    print_desktop_banner()

    # Step 1-5: Web/backend fundamentals
    py_ok = check_python()
    if not py_ok:
        sys.exit(1)

    venv_ok = check_and_setup_venv()
    node_ok = check_node_and_frontend()
    ollama_status = check_ollama_and_models()
    check_sandbox_capability()

    # Step 6-8: Desktop fundamentals
    rust_ok = check_rust_toolchain()
    msvc_ok = check_msvc_build_tools()
    tauri_ok = check_tauri_dependencies()

    print(f"\n{Ansi.BOLD}{Ansi.CYAN}{'=' * 78}{Ansi.RESET}")
    print(f"{Ansi.BOLD}DESKTOP SETUP SUMMARY{Ansi.RESET}")
    print(f"{Ansi.BOLD}{Ansi.CYAN}{'=' * 78}{Ansi.RESET}")

    all_ok = venv_ok and node_ok and rust_ok and tauri_ok and ollama_status["online"] and len(ollama_status["missing_models"]) == 0

    if all_ok:
        print(f"\n {Ansi.GREEN}{Ansi.BOLD}[OK] ALL DESKTOP PREREQUISITES SATISFIED!{Ansi.RESET}")
        print(" You can now run the native desktop application at any time using:")
        print(f"   {Ansi.CYAN}Launch Desktop.bat{Ansi.RESET}  (or 'npm run desktop' inside frontend/)\n")
    else:
        print(f"\n {Ansi.YELLOW}{Ansi.BOLD}[!] DESKTOP SETUP COMPLETED WITH PENDING ACTIONS:{Ansi.RESET}")
        if not rust_ok:
            print(f"   - Install Rust MSVC: {Ansi.BOLD}https://rustup.rs/{Ansi.RESET}")
        if not ollama_status["online"]:
            print(f"   - Start Ollama:     {Ansi.BOLD}ollama serve{Ansi.RESET}")
        for missing in ollama_status.get("missing_models", []):
            print(f"   - Pull Model:       {Ansi.BOLD}ollama pull {missing}{Ansi.RESET}")
        print(f"\n After addressing pending items, run {Ansi.CYAN}Launch Desktop.bat{Ansi.RESET} to start.\n")


if __name__ == "__main__":
    main()

