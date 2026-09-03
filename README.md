# Sovereign AI Workbench

> Air-gapped, on-premise, multimodal agentic AI workbench for sensitive industrial, defense, PSU, and government workflows.

## Current Status

| Milestone | Status |
|---|:---:|
| Milestone 1 — Local AI Vertical Slice | COMPLETE |
| Milestone 2 — Local Document Intelligence & Ingestion | COMPLETE |
| Milestone 3 — Local Vector Store & RAG | COMPLETE |
| Milestone 4 — Multi-Model Router, Workflow Engine & HITL DOCX (Workflow A) | COMPLETE |
| Milestone 5 — Secure Coding Agent & Sandboxed Execution Loop (Workflow B) | COMPLETE |
| Milestone 6 — Sovereignty, Air-Gap Verification & Cryptographic Audit Ledger | COMPLETE |
| Milestone 7 — Final Polish, Master Regression Suite & Presentation Package | COMPLETE |


The platform delivers two complete, production-grade autonomous agentic workflows:

- **⚡ Hero Workflow A (Industrial Compliance Audit & DOCX Note)**:
  `Raw PDF/Scan` $\rightarrow$ `PyMuPDF / Vision OCR` $\rightarrow$ `ChromaDB Dense SOP Search` $\rightarrow$ `Grounded RAG Audit` $\rightarrow$ `Mandatory Human-in-the-Loop Approval Gate` $\rightarrow$ `Formal Word .docx Approval Note`.
- **💻 Hero Workflow B (Secure Coding Agent & Sandbox Execution)**:
  `Technical Prompt` $\rightarrow$ `Specification & Edge-Case Breakdown` $\rightarrow$ `Python + Unittest Synthesis` $\rightarrow$ `AST Air-Gap Policy Guard` $\rightarrow$ `Isolated Sandbox Execution` $\rightarrow$ `Automated 3-Pass Self-Repair Loop` $\rightarrow$ `Verified .py Script Download`.

---

# Features

## Milestone 1
- React + TypeScript frontend
- FastAPI backend
- Ollama integration
- `qwen2.5-coder:1.5b` local model
- Model-provider abstraction

- Backend/model health checks
- Direct AI chat & Copilot
- Industrial control-room UI
- Local inference

## Milestone 2
- PDF upload & PNG/JPG/JPEG upload
- UUID-based document IDs & local persistent `registry.json`
- High-speed PDF text extraction using PyMuPDF (`fitz`)
- Image/scanned-document understanding through Ollama Vision
- Local AI document auditing with risk-oriented analysis

## Milestone 3
- Persistent local vector database (**ChromaDB**)
- Real dense embedding provider (**`nomic-embed-text`**, 768 dimensions via local Ollama)
- Local fallback embedding engine (`all-MiniLM-L6-v2` via SentenceTransformers)
- Deterministic text chunking engine with configurable chunk size & overlap
- Fast cosine similarity semantic vector search (< 2ms)
- RAG-grounded compliance audits with verified Grounded Citations linking conclusions to source standard filenames, pages, and chunk IDs

## Milestone 4 (Hero Workflow A: Document Compliance & DOCX)
- **Multi-Model Auto-Router**: Dynamic capability inference matching task requirements (`vision`, `coding`, `reasoning`, `rag_audit`, `embeddings`) to optimal local open-weight models with fallback handling.
- **Autonomous Hero Workflow Engine**: Stateful 5-step industrial execution pipeline:
  1. `Document Extraction & OCR`
  2. `Local SOP Knowledge Search` (ChromaDB)
  3. `RAG Compliance & Risk Audit`
  4. `Human-in-the-Loop (HITL) Checkpoint` (Mandatory pause for human approval)
  5. `DOCX Approval Note Generation`
- **Interactive Human-in-the-Loop (HITL) Checkpoint**: Real-time pipeline pausing at Step 4; lets human approvers review findings, edit mandated remediation timelines, and approve or reject.
- **On-Premise DOCX Generator**: Generates styled `.docx` executive approval notes with defect findings tables, ChromaDB citations table, risk matrix, mandatory remediation timeline, and human sign-off block.

## Milestone 5 (Hero Workflow B: Secure Coding Agent & Sandbox)
- **Static AST Air-Gap Policy Guard**: AST static analysis blocking all prohibited network modules (`socket`, `requests`, `urllib`, `http`, `aiohttp`, `httpx`), shell execution (`subprocess`, `os.system`, `os.popen`), and dynamic execution (`eval`, `exec`, `compile`, `__import__`).
- **Isolated Sandboxed Execution Engine**: Dual-mode execution via Docker container (`--network none`, `--memory 128m`) or isolated subprocess with clean environment and strict 5.0-second timeout cap to prevent runaway execution.
- **Autonomous Multi-Pass Self-Repair Loop**: Synthesizes Python code and companion `unittest` test suites. When tests fail, automatically captures tracebacks, re-feeds errors into local LLM, patches code, and re-runs sandbox tests (up to 3 automated iterations).
- **Single-Cockpit Unified Studio**: Interactive mode switcher between **Workflow A (Compliance & DOCX)** and **Workflow B (Secure Coding & Sandbox)** with real-time 6-node visual execution graph, syntax-highlighted code viewer, sandbox terminal console, and one-click `.py` script artifact download.

## Milestone 6 (Sovereignty & Cryptographic Audit Ledger)
- **Active Network Egress Probers**: Socket-level probes against DNS, public IPs, and cloud AI domains verifying 0 bytes escape the perimeter.
- **Cryptographic Audit Ledger (SHA-256 Hash Chain)**: Immutable tamper-evident hash chain recording every prompt, document hash, model dispatch, and human signature.
- **Defense Audit Exporter**: Instant one-click CSV / JSONL cryptographic audit export for regulatory compliance and air-gap verification.
- **Interactive Security Dashboard**: Real-time sovereignty scoring, egress probe monitor, and hash chain verification.

## Milestone 7 (Final Polish, Master Regression Suite & Presentation Package)
- **One-Click Industrial Demo Seeder**: Generates synthetic refinery ultrasonic thickness inspection reports and seeds `SOP-REF-570` into ChromaDB via `POST /api/demo/seed` and top toolbar button.
- **Master 7-Step End-to-End Regression Suite**: Fully automated verification script (`scripts/verify_e2e_workbench.py`) validating health, document ingestion, vector retrieval, auto-routing, Hero Workflow A, Hero Workflow B, and air-gap cryptography (100% PASSING).
- **Fast Primary Chat SLM**: `qwen2.5-coder:1.5b` default with instant model switcher for `deepseek-r1:1.5b` and `llama3.2:3b`.
- **Comprehensive Pitch & Defense Guide**: 3-minute hackathon pitch script, 5-minute technical defense guide, and judge Q&A matrix in `DOCS/PRESENTATION_DEMO_SCRIPT.md`.

## Milestone 8 (Modernized UI & Streamlined Workspaces)
- **Claude-Inspired Home Experience**: Calm, minimalist home screen with bottom prompt dock and 3 discrete workspace cards (Document Inspector, Coding Agent, Knowledge Base).
- **In-Box Model Selector Pill**: Clean model selector dropdown embedded directly into the prompt dock bottom action bar, querying installed local Ollama models.
- **On-Page Copilot Chat & Session History**: Chat prompts execute seamlessly on the Home Screen without page jumps, supported by a slide-in session history drawer (`localStorage`), New Chat / Close Chat controls, and file attachments (`📎`).
- **Document Inspector Enhancements**: Renamed from "Industrial Audit" to an intuitive name, added delete button (`Trash2`) for inspection scans/PDFs via `DELETE /api/documents/{id}`, and fixed stepper text responsiveness with `minmax(0, 1fr)`.
- **Knowledge Base RAG Search**: Dedicated central vector query search bar with 1-click suggested query chips and real-time SOP library filtering.
- **Clean Coding Workspace**: Starts with a blank, focused canvas on load with 1-click `Clear Task` reset.

---


# Architecture

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                           LOCAL ON-PREMISE MACHINE                        │
│                                                                           │
│  React + Vite Single-Cockpit Studio (Workflow A & Workflow B Switcher)    │
│       │                                                                   │
│       │ HTTP REST /api                                                    │
│       ▼                                                                   │
│  FastAPI + Uvicorn                                                        │
│       │                                                                   │
│       ├──────► Multi-Model Router (Capability-based dispatch)             │
│       ├──────► Workflow A Engine (PyMuPDF → ChromaDB → RAG → HITL → DOCX) │
│       ├──────► Workflow B Coding Agent (Spec → AST Guard → Sandbox Repair)│
│       ├──────► AST Security Policy Guard (Zero network/shell egress)      │
│       ├──────► Sandboxed Runner (Docker / Subprocess with 5s timeout)     │
│       ├──────► ChromaDB Persistent Vector Store (SOPs & Standards)        │
│       └──────► Local Document Storage (data/documents, data/artifacts)    │
│       │                                                                   │
│       ▼                                                                   │
│  Ollama :11434                                                            │
│       ├──► nomic-embed-text (768-dim dense embeddings)                    │
│       └──► qwen2.5-coder:1.5b (reasoning, code synthesis & RAG audits)    │
│                                                                           │
│  100% AIR-GAPPED: Zero external API calls or telemetry.                   │
└───────────────────────────────────────────────────────────────────────────┘

```

The frontend communicates with FastAPI only. FastAPI communicates with Ollama, ChromaDB, and local storage.

---

# Project Structure

```text
Sovereign-AI-Workbench/
│
├── DOCS/
│   ├── Architecture.md
│   ├── Design.md
│   ├── Memory.md
│   ├── Phases.md
│   ├── PRD.md
│   └── Rules.md
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── models/
│   │   │   ├── base.py
│   │   │   ├── ollama_provider.py
│   │   │   └── schemas.py
│   │   ├── services/
│   │   │   ├── embedding/
│   │   │   │   ├── base.py
│   │   │   │   ├── ollama_embedding.py
│   │   │   │   └── sentence_transformer_embedding.py
│   │   │   ├── vector_store/
│   │   │   │   ├── base.py
│   │   │   │   └── chroma_store.py
│   │   │   ├── coding_agent.py
│   │   │   ├── document_service.py
│   │   │   ├── docx_service.py
│   │   │   ├── knowledge_service.py
│   │   │   ├── model_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── retrieval_service.py
│   │   │   ├── router_service.py
│   │   │   ├── sandbox_service.py
│   │   │   ├── security_guard.py
│   │   │   └── workflow_engine.py
│   │   ├── config.py
│   │   └── main.py
│   ├── data/
│   │   ├── artifacts/
│   │   ├── documents/
│   │   │   └── registry.json
│   │   └── knowledge_base/
│   │       └── chroma/
│   ├── tests/
│   │   ├── fixtures/
│   │   │   └── SOP-REF-570_Piping_Integrity.txt
│   │   ├── test_docx_service.py
│   │   ├── test_e2e_all_milestones.py
│   │   ├── test_rag_chroma.py
│   │   ├── test_router.py
│   │   └── test_workflow_engine.py
│   ├── .env.example
│   ├── requirements.txt
│   └── .venv/                 # local only, NOT committed
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── components/
│   │   │   ├── DocumentWorkspace.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── KnowledgeWorkspace.tsx
│   │   │   ├── PromptBox.tsx
│   │   │   ├── ResponseViewer.tsx
│   │   │   ├── SystemStatus.tsx
│   │   │   └── WorkflowWorkspace.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

# Requirements

You need:

- Git
- Python
- pip
- Node.js
- npm
- Ollama

Development was verified with approximately:

```text
Node.js 22.x
Python 3.14.x
Ollama
qwen2.5-coder:1.5b (LLM reasoning, Code synthesis & Audits)
nomic-embed-text (Dense 768-dim embeddings)
```

A GPU is recommended for practical performance, although the current development models run on CPU.

---

# 1. Clone the Repository

```cmd
git clone https://github.com/FASTGAMER1247/Sovereign-AI-Workbench.git
cd Sovereign-AI-Workbench
```

---

# 2. Set Up Ollama

Verify Ollama:

```cmd
ollama --version
```

Pull the required local models:

```cmd
ollama pull qwen2.5-coder:1.5b
ollama pull nomic-embed-text
```

Verify installed models:

```cmd
ollama list
```

You should see:

```text
nomic-embed-text:latest
qwen2.5-coder:1.5b
```


Check the API:

```cmd
curl.exe http://127.0.0.1:11434/api/tags
```

## Windows Note

Use:

```text
http://127.0.0.1:11434
```

rather than `localhost` when configuring Ollama. This avoids Windows IPv6/localhost resolution issues encountered during development.

---

# 3. Set Up the Backend

```cmd
cd backend
```

Create the virtual environment:

```cmd
python -m venv .venv
```

### Windows Command Prompt

```cmd
.venv\Scripts\activate
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
```

### Git Bash

```bash
source .venv/Scripts/activate
```

> `source` is not a Windows Command Prompt command.

Install dependencies:

```cmd
python -m pip install -r requirements.txt
```

---

# 4. Configure `.env`

Create the local environment file:

```cmd
copy .env.example .env
```

The important local configuration is:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
DEFAULT_MODEL=qwen2.5-coder:1.5b
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
CHROMA_PERSIST_DIR=data/knowledge_base/chroma
HOST=127.0.0.1
PORT=8000
```


Do not commit `backend/.env`.

The repository contains `.env.example` so every developer can create their own local configuration.

---

# 5. Start the Backend

From:

```text
Sovereign-AI-Workbench\backend
```

run:

```cmd
python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

Keep this terminal open.

---

# 6. Verify the Backend

Open another terminal:

```cmd
curl.exe http://127.0.0.1:8000/api/health
```

Then check model health and vector database stats:

```cmd
curl.exe http://127.0.0.1:8000/api/models/health
curl.exe http://127.0.0.1:8000/api/knowledge/stats
```

---

# 7. Start the Frontend

Open another terminal:

```cmd
cd frontend
```

Install dependencies:

```cmd
npm install
```

Start Vite:

```cmd
npm run dev
```

Vite will print the local URL, normally:

```text
http://localhost:5173/
```

Use the exact URL printed by Vite.

---

# Running the Complete System

You normally need:

### Terminal 1 — Ollama

Ollama running with:

```text
qwen2.5-coder:1.5b
nomic-embed-text
```


### Terminal 2 — Backend

```cmd
cd Sovereign-AI-Workbench\backend
.venv\Scripts\activate
python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 3 — Frontend

```cmd
cd Sovereign-AI-Workbench\frontend
npm run dev
```

Then open the Vite URL.

---

# Direct AI Chat

Use the **Direct AI Chat** mode and enter a prompt such as:

```text
Explain sovereign AI in two sentences.
```

---

# Document Intelligence & Compliance Audit

Select **Document Intelligence**.

Supported uploads:

```text
.pdf
.png
.jpg
.jpeg
```

The workflow is:

```text
Upload
  ↓
Validation & Local Storage
  ↓
Text Extraction (PyMuPDF / Ollama Vision)
  ↓
Optional Knowledge Ingestion (Index to ChromaDB)
  ↓
RAG Compliance Audit (Cross-referenced against ChromaDB SOPs)
  ↓
Audit Report with Verified Grounded Citations
```

---

# Knowledge Base & Semantic Search (RAG)

Select **Knowledge Base (RAG)**.

Features:
1. **Organizational Standards Repository**: Ingest SOPs, engineering manuals, and regulatory compliance guidelines.
2. **Chunk Vector Inspector**: Inspect chunk token counts, character lengths, and provenance metadata.
3. **Semantic Search Playground**: Query standards in natural language with real-time cosine similarity ranking against ChromaDB.

---

# API Endpoints

## System
```text
GET /api/health
GET /api/models/health
GET /api/models
```

## AI
```text
POST /api/chat
```

## Documents (Milestone 2)
```text
POST /api/documents/upload
GET  /api/documents
GET  /api/documents/{id}
POST /api/documents/{id}/extract
POST /api/documents/{id}/analyze
POST /api/documents/{id}/rag-audit
```

## Knowledge Base & Vector Store (Milestone 3)
```text
POST   /api/knowledge/ingest
GET    /api/knowledge/documents
GET    /api/knowledge/documents/{id}
GET    /api/knowledge/documents/{id}/chunks
DELETE /api/knowledge/documents/{id}
POST   /api/knowledge/query
GET    /api/knowledge/stats
```

## Multi-Model Router & Agentic Workflows (Milestone 4)
```text
POST /api/router/route
POST /api/workflows/execute
GET  /api/workflows/executions
GET  /api/workflows/executions/{id}
POST /api/workflows/executions/{id}/approve
GET  /api/workflows/executions/{id}/artifact
```

---

# Verification Status

Milestones 1, 2, 3, and 4 have been verified with automated end-to-end regression test suites.

| Test | Result |
|---|:---:|
| Backend system health (`/api/health`) | PASS |
| Ollama model availability (`/api/models/health`) | PASS |
| Direct AI chat completion (`/api/chat`) | PASS |
| PDF document upload (`/api/documents/upload`) | PASS |
| PDF text extraction via PyMuPDF (`/api/documents/{id}/extract`) | PASS |
| Multimodal image upload & Vision extraction | PASS |
| Local AI standard document audit (`/api/documents/{id}/analyze`) | PASS |
| SOP technical text ingestion (`/api/knowledge/ingest`) | PASS |
| Genuine 768-dim embeddings (`nomic-embed-text`) | PASS |
| ChromaDB persistent client initialization | PASS |
| ChromaDB knowledge stats (`/api/knowledge/stats`) | PASS |
| ChromaDB document registry & chunk inspector | PASS |
| Cosine similarity semantic search (`/api/knowledge/query`) | PASS |
| RAG document compliance audit (`/api/documents/{id}/rag-audit`) | PASS |
| Verified Grounded Citations generation | PASS |
| ChromaDB document & vector deletion | PASS |
| Disk persistence across fresh client instances | PASS |
| Invalid extension rejection | PASS |
| Missing document 404 handling | PASS |
| Multi-Model Auto-Router task inference (`/api/router/route`) | PASS |
| Multi-Model Vision, Coding, RAG & Embedding classification | PASS |
| DOCX Generation with tables, citations & signatures (`test_docx_service.py`) | PASS |
| Autonomous Hero Workflow execution (`/api/workflows/execute`) | PASS |
| Workflow live polling & execution graph state tracking | PASS |
| Human-in-the-Loop Checkpoint (PAUSE in `waiting_for_approval`) | PASS |
| Human Sign-off Approval decision (`/api/workflows/executions/{id}/approve`) | PASS |
| Generated DOCX Approval Note download (`/api/workflows/executions/{id}/artifact`) | PASS |
| Frontend TypeScript & Vite production build (`npm run build`) | PASS |

**28/28 verification tests passed.**

The detailed implementation state and verification history are maintained in:

```text
DOCS/Memory.md
```

---

# Roadmap

```text
Milestone 1 — Local AI Vertical Slice              [COMPLETED]
        ↓
Milestone 2 — Document Intelligence & Vision       [COMPLETED]
        ↓
Milestone 3 — ChromaDB Vector Store & Local RAG    [COMPLETED]
        ↓
Milestone 4 — Multi-Model Router & HITL DOCX       [COMPLETED]
        ↓
Milestone 5 — Visual Agent Canvas & Flow Graph     [NEXT]
        ↓
Milestone 6 — Sandboxed Tool Execution Loop
        ↓
Milestone 7 — Security & Air-Gap Verification
        ↓
Final Hackathon Demonstration
```

---

# Next Milestone — Visual Agent Canvas & Execution Graph (Milestone 5)

Planned capabilities include:
1. **React Flow Visual Canvas**: Interactive drag-and-drop node graph for designing custom agentic workflows.
2. **Dynamic Node Configuration**: Custom inspector panels for Document Loader, Router, SOP Retriever, LLM Auditor, HITL Gate, and Artifact Exporter nodes.
3. **Real-time Live Execution Highlighting**: Visual edge animation and node status pulsation matching background workflow state machine events.
4. **Zustand State Store**: Synchronized flow state and execution logs.

---

# Documentation

The `DOCS/` directory contains the project's engineering documents:

```text
DOCS/
├── PRD.md
├── Architecture.md
├── Design.md
├── Rules.md
├── Phases.md
└── Memory.md
```

`Memory.md` is particularly important for development handoffs. It records what has actually been built, verified, discovered, and what should be implemented next.

When handing the project to another developer or AI agent:

> Read `DOCS/Memory.md` first, then the other documents as required.

---

# Sovereignty Principle

The core project principle is:

> **The data stays local. The intelligence comes to the data.**

The current implementation is designed so that AI inference and document processing occur locally through the application backend and Ollama.

For a production air-gapped deployment, application architecture should be supplemented with operating-system and network-level isolation and visible network verification.

---

# Troubleshooting

## `source` is not recognized

If you are using Windows Command Prompt, use:

```cmd
.venv\Scripts\activate
```

not:

```bash
source .venv/Scripts/activate
```

## `.venv\Scripts\activate` is not recognized

Make sure you are inside:

```text
Sovereign-AI-Workbench\backend
```

Then check:

```cmd
dir .venv\Scripts
```

If the environment does not exist:

```cmd
python -m venv .venv
```

## Ollama connection fails

Check:

```cmd
curl.exe http://127.0.0.1:11434/api/tags
```

If the model is missing:

```cmd
ollama pull qwen2.5-coder:1.5b
```


Check `.env`:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## Frontend cannot reach backend

Check:

```cmd
curl.exe http://127.0.0.1:8000/api/health
```

Make sure the backend is running.

Then restart:

```cmd
cd frontend
npm run dev
```

## Port 5173 is already in use

Vite may automatically use `5174` or another available port. Use the URL printed by `npm run dev`.

---

# Development Philosophy

The project prioritizes:

- Local inference
- Data sovereignty
- Explicit architecture boundaries
- Model-provider abstraction
- Reproducible development
- Verifiable functionality
- Human approval for future agent actions
- No fake AI responses
- No accidental cloud dependencies

See `DOCS/PRD.md`, `DOCS/Architecture.md`, `DOCS/Rules.md`, `DOCS/Phases.md`, `DOCS/Design.md`, and `DOCS/Memory.md` for the detailed project specification.
