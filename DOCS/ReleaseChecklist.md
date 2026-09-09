# Sovereign AI Workbench — Final Release Checklist

> **Target Release**: v0.1.0-sovereign  
> **Supported Targets**: Target 1 (Web Application), Target 2 (Desktop Development), Target 3 (Production Windows Installer)

---

## 1. Build Verification

- [x] **Frontend Build**: 
pm run build (	sc && vite build) compiles cleanly with 0 TypeScript/bundler errors.
- [x] **Backend Standalone Packaging**: python scripts/package_backend.py produces:
  - 
esources/backend/sovereign-backend/sovereign-backend.exe (FastAPI Uvicorn server, 16.3 MB)
  - 
esources/backend/sovereign-backend/sovereign-sandbox-runner.exe (Dedicated sandbox runner, 9.4 MB)
- [x] **Cargo Rust Check**: cargo check in rontend/src-tauri passes with 0 warnings/errors.
- [x] **Production Installer Generation**: 
pm run desktop:build produces:
  - NSIS Installer: rontend/src-tauri/target/release/bundle/nsis/Sovereign AI Workbench_0.1.0_x64-setup.exe (59.9 MB)
  - Windows MSI: rontend/src-tauri/target/release/bundle/msi/Sovereign AI Workbench_0.1.0_x64_en-US.msi (75.0 MB)

---

## 2. Target 1: Web Application

- [x] **Launcher**: Launch Workbench.bat boots scripts/launcher.py cleanly.
- [x] **Browser Access**: Automatically opens Chrome/Edge to http://localhost:5173.
- [x] **Backend Connectivity**: Communicates with local FastAPI backend on 127.0.0.1:8000.
- [x] **Data Storage**: Writes development assets and databases to local ackend/data/ folder.

---

## 3. Target 2: Desktop Development

- [x] **Launcher**: Launch Desktop.bat initializes developer environment and launches 
pm run desktop.
- [x] **Tauri Window**: Spawns native 1500x960 desktop window with Hot Module Replacement (HMR).
- [x] **Headless Backend**: Spawns Python virtualenv backend with CREATE_NO_WINDOW (no terminal popups).
- [x] **Scoped Shutdown**: Terminates backend child process tree on window close.

---

## 4. Target 3: Production Desktop Application

- [x] **Installer Executable**: Generates signed/packaged standalone installer.
- [x] **Zero Host Python**: Runs completely without system Python or developer .venv.
- [x] **Zero Host Node.js**: Front-end static assets embedded directly into WebView2 application binary.
- [x] **Zero Host Rust**: Pre-compiled native executable.
- [x] **Zero Terminal Windows**: Both app window and spawned backend/sandbox run headless with CREATE_NO_WINDOW.
- [x] **Data Safety**: Production defaults mutable documents, ChromaDB, and audit logs to %LOCALAPPDATA%\SovereignAIWorkbench\data.

---

## 5. Local AI & Model Engine

- [x] **Ollama Detection**: Detects local Ollama instance on http://127.0.0.1:11434.
- [x] **Required Model Enforcement**: Flags missing required models (qwen2.5-coder:1.5b and 
omic-embed-text).
- [x] **Optional Model Classification**: Clearly distinguishes optional synthesis/reasoning models (llama3.2:3b, deepseek-r1:1.5b).
- [x] **User-Initiated Downloads**: In-app [ Install Model ] triggers explicit local pull without external telemetry.

---

## 6. Hero Workflow A: Document Compliance & DOCX

- [x] **Document Ingestion**: Extracts text from PDFs and scanned images via PyMuPDF.
- [x] **ChromaDB Semantic Search**: Vector retrieval finds relevant SOP clauses with cosine similarity metrics.
- [x] **RAG Compliance Audit**: Generates findings matrix with Grounded Citations.
- [x] **Human-in-the-Loop Gate**: Pauses pipeline execution at Step 4 for mandatory human review and timeline editing.
- [x] **DOCX Approval Note**: Generates formal .docx executive note with embedded tables and signature block.

---

## 7. Hero Workflow B: Secure Coding Agent & Sandbox

- [x] **Code & Test Synthesis**: Generates clean Python code and companion unittest test suites.
- [x] **Static AST Security Guard**: Blocks prohibited network/shell modules (os.system, subprocess, socket, 
equests, eval).
- [x] **Standalone Sandbox Runner**: sovereign-sandbox-runner.exe executes test suites in isolated temp directory.
- [x] **Self-Repair Loop**: Automatically captures test failure tracebacks, prompts local LLM, patches code, and re-executes.
- [x] **Artifact Packaging**: Exports verified .py script download.

---

## 8. Sovereignty, Air-Gap Readiness & Cryptographic Audit

- [x] **Active Egress Probes**: Validates that socket connections to DNS, Public IPs, and Cloud AI domains are blocked.
- [x] **Cryptographic Audit Ledger**: Records all prompt hashes, model decisions, and user sign-offs in append-only SHA-256 hash chain.
- [x] **Tamper Detection**: Hash verification audits block links and confirms 100% chain integrity.
- [x] **Defense Audit Exporter**: One-click CSV/JSONL export for regulatory inspections.

---

## 9. Process Lifecycle & Teardown

- [x] **Normal Window Close**: Closing application window triggers RunEvent::Exit, terminating backend child process tree.
- [x] **Zero Orphan Processes**: Confirmed 0 orphan sovereign-backend.exe or sovereign-sandbox-runner.exe instances remain.
