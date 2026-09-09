# Production Validation & Clean-Machine Test Procedure

> **Document Status**: Active / Mandatory Clean-Machine Verification Protocol  
> **Target**: Sovereign AI Workbench Standalone Windows Production Installer (Sovereign AI Workbench_0.1.0_x64-setup.exe)

---

## 1. Clean-Machine Pre-Condition Verification

The test machine must be a clean installation of Windows 10 or 11 (x64) without development tools installed. Before launching the installer, execute the following commands in PowerShell to verify the host environment:

`powershell
# Verify Python is NOT installed
Get-Command python -ErrorAction SilentlyContinue
Get-Command py -ErrorAction SilentlyContinue

# Verify Node.js / npm is NOT installed
Get-Command node -ErrorAction SilentlyContinue
Get-Command npm -ErrorAction SilentlyContinue

# Verify Rust / Cargo is NOT installed
Get-Command rustc -ErrorAction SilentlyContinue
Get-Command cargo -ErrorAction SilentlyContinue
`

All commands above must return empty / not found.

---

## 2. External Runtime Dependency: Ollama

> [!IMPORTANT]
> Ollama is the sole external runtime prerequisite for local AI inference. It is never silently bundled or installed by the workbench installer.

1. Download and install Ollama from [https://ollama.com/download](https://ollama.com/download).
2. Confirm the Ollama daemon is running:
   `cmd
   curl.exe http://127.0.0.1:11434/api/tags
   `
3. Do **not** pre-install models if testing the first-run installation flow.

---

## 3. Step-by-Step Installation & Launch Procedure

### Step 3.1: Run the Standalone Installer
- Copy Sovereign AI Workbench_0.1.0_x64-setup.exe to the test machine.
- Double-click the installer.
- **Expected Result**: NSIS installer prompts for installation (defaults to per-user %LOCALAPPDATA%\Programs\Sovereign AI Workbench).
- Complete the installation wizard.
- Verify desktop and start menu shortcuts are created.

### Step 3.2: First Application Launch
- Launch **Sovereign AI Workbench** from the desktop shortcut or Start Menu.
- **Expected Results**:
  - Native application window opens (Tauri 2 / WebView2).
  - **Zero** command prompt, PowerShell, or console windows appear.
  - Bundled sovereign-backend.exe starts headlessly on 127.0.0.1:8000.
  - Frontend loads the Home screen.
  - FirstRunCheckModal automatically appears to verify system readiness.

---

## 4. Verification Checklist

| Status | Verification Item | Expected Observation |
|:---:|---|---|
| [ ] | **Host Architecture** | Windows 10/11 x64 architecture verified |
| [ ] | **Python Dependency** | Python is NOT installed on host system |
| [ ] | **Node.js Dependency** | Node.js / npm is NOT installed on host system |
| [ ] | **Rust Dependency** | Rust / Cargo is NOT installed on host system |
| [ ] | **Source Tree Dependency** | Project source tree and developer .venv are NOT present |
| [ ] | **Installation Success** | Installer completes without errors or UAC failures |
| [ ] | **Clean Launch** | Application launches without any CMD/terminal windows |
| [ ] | **Bundled Backend Startup** | Bundled sovereign-backend.exe launches and responds on port 8000 |
| [ ] | **Frontend Rendering** | React UI renders cleanly in native Tauri window |
| [ ] | **Data Directory Safety** | Mutable data writes to %LOCALAPPDATA%\SovereignAIWorkbench\data |
| [ ] | **Ollama Detection** | Status displays Ollama online (http://127.0.0.1:11434) |
| [ ] | **Missing Model Flag** | Missing qwen2.5-coder:1.5b and 
omic-embed-text flagged as Action Required |
| [ ] | **In-App Model Install** | Clicking [ Install Model ] triggers in-app pull via local daemon |
| [ ] | **Copilot Chat** | Local prompt execution generates valid text without cloud calls |
| [ ] | **Document Ingestion** | Uploading PDF extracts text and updates registry |
| [ ] | **Local RAG Retrieval** | Vector query returns similarity-scored SOP chunks from ChromaDB |
| [ ] | **Workflow A (Compliance)** | 5-step pipeline completes, pauses at HITL gate, produces signed .docx |
| [ ] | **Workflow B (Coding)** | Synthesizes Python code and companion unittests |
| [ ] | **AST Security Guard** | Prohibits blocked modules (os.system, socket, 
equests, eval) |
| [ ] | **Standalone Sandbox Runner** | sovereign-sandbox-runner.exe executes tests without host Python |
| [ ] | **Self-Repair Loop** | Automatically captures test failure, repairs code, and re-executes tests |
| [ ] | **Air-Gap Verification** | Security dashboard shows 100% egress blocked on probe suite |
| [ ] | **Cryptographic Audit Ledger** | SHA-256 hash chain verification returns 100% intact |
| [ ] | **Process Lifecycle Shutdown** | Closing window cleanly kills sovereign-backend.exe with 0 orphan processes |

---

## 5. Process Lifecycle Validation Commands

Verify zero orphan processes remain after closing the application window:

`powershell
# Must return zero processes
Get-Process -Name 'sovereign-backend' -ErrorAction SilentlyContinue
Get-Process -Name 'sovereign-sandbox-runner' -ErrorAction SilentlyContinue
Get-Process -Name 'Sovereign AI Workbench' -ErrorAction SilentlyContinue
`
