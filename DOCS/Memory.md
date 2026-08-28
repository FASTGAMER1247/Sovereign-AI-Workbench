Absolutely. For your setup, `memory.md` should act as the **persistent project state / handoff file** between AI coding agents.

I’d make it much more structured than a simple progress log: the AI should be able to open it and immediately understand **what exists, what works, what is broken, what was decided, what changed, and what to build next**.

````md
# MEMORY.md — Sovereign AI Workbench

> This file is the persistent project memory for the Sovereign AI Workbench.
> 
> It is maintained by the AI coding agent working on this repository.
> 
> A new AI agent MUST read this file before making changes to the project.
> The agent MUST update this file after meaningful implementation work.
>
> This file is NOT a replacement for source code, documentation, or git history.
> It is the current operational state of the project.

---

# 1. PROJECT IDENTITY

## Project

Sovereign On-Premise Agentic AI Workbench

## Goal

Build a self-hosted, air-gapped agentic AI workbench that allows industrial,
government, and defense-related users to run multimodal AI workflows locally
without sending sensitive information to external AI providers.

## Hackathon Build Target

7-day MVP

## Team Size

3–4 developers

## Primary Demonstration

A user should be able to:

1. Upload a confidential/scanned inspection document.
2. Process it locally using OCR/vision.
3. Extract important findings.
4. Search a local organizational knowledge base.
5. Analyze the findings using a local model.
6. Pause for human approval.
7. Generate a real DOCX approval note.
8. Run a separate coding-agent workflow.
9. Execute generated code inside an isolated sandbox.
10. Demonstrate that the workflows continue operating without internet access.

---

# 2. CURRENT PROJECT STATUS

> UPDATE THIS SECTION FREQUENTLY.
>
> This is the first section a new AI agent should read.

## Overall Status

IN PROGRESS — PHASE 6 COMPLETE

## Current Phase

PHASE 6 / DAY 6 — SOVEREIGNTY & AIR-GAP VERIFICATION, AUDIT LEDGER & SECURITY DASHBOARD

## Current Day

DAY 6 / 7

## Overall Completion

90%

## Current Objective

Phase 6 complete. Cryptographic SHA-256 Hash-Chained Audit Ledger (`audit_logger.py`), Zero-Egress Network Prober & Sovereignty Service (`sovereignty_service.py`), 5 security REST endpoints (`routes.py`), and interactive Security & Air-Gap Dashboard (`SecurityDashboard.tsx` in `UnifiedStudio.tsx`) are implemented and fully verified with automated test suites.

Next: Phase 7 — Final End-to-End Polish, Performance Optimizations & Hackathon Demo Package.

---

# 3. WHAT IS CURRENTLY WORKING

> Only list functionality that has actually been implemented and tested.

- FastAPI backend running at `http://127.0.0.1:8000` (uvicorn, Python 3.14.4) ✅
- `GET /api/health` → `{"status":"ok","sovereign_mode":true}` ✅
- `GET /api/models/health` → Ollama connected, `qwen2.5-coder:1.5b` + `nomic-embed-text:latest` available ✅
- `GET /api/models` → Returns installed local model list ✅
- `POST /api/chat` → Real completions from local models via Ollama ✅
- Multi-Model Dynamic Router prioritizing specialized coder models (`qwen2.5-coder:1.5b`) for code synthesis, AST verification, and self-repair loops ✅
- `POST /api/documents/upload` → Secure local document upload (.pdf, .png, .jpg, .jpeg) with UUID & metadata registry ✅
- `GET /api/documents` → Returns list of all ingested documents ✅
- `GET /api/documents/{document_id}` → Returns single document metadata ✅
- `POST /api/documents/{document_id}/extract` → Fast text extraction from PDF using PyMuPDF (`fitz`) and multimodal visual transcription for images using Ollama Vision ✅
- `POST /api/documents/{document_id}/analyze` → Local AI document analysis (Executive summary, Findings, Risk Assessment, Recommendations) using `qwen2.5-coder:1.5b` ✅

- `POST /api/documents/{document_id}/rag-audit` → RAG-grounded compliance audit cross-referencing organizational standards and SOPs with grounded citations ✅
- `POST /api/knowledge/ingest` → Ingest uploaded documents or direct text/standards into the local persistent vector store ✅
- `GET /api/knowledge/documents` → List all indexed standards and SOPs in vector store ✅
- `GET /api/knowledge/documents/{document_id}/chunks` → Inspect all vector chunks for a specific standard ✅
- `DELETE /api/knowledge/documents/{document_id}` → Remove document and vectors from knowledge base ✅
- `POST /api/knowledge/query` → Fast cosine similarity semantic search across all indexed chunks (< 2ms) ✅
- `GET /api/knowledge/stats` → Vector store statistics and active embedding engine info ✅
- `POST /api/router/route` → Dynamic capability inference matching task requirements (`vision`, `coding`, `reasoning`, `rag_audit`, `embeddings`) to optimal local open-weight models ✅
- `POST /api/workflows/execute` → Trigger stateful 5-step autonomous Hero Workflow (Extract → SOP Search → RAG Audit → HITL Pause → DOCX Generation) ✅
- `GET /api/workflows/executions` → List all workflow execution sessions and live statuses ✅
- `GET /api/workflows/executions/{id}` → Retrieve execution graph, current step status, extracted findings, and citations ✅
- `POST /api/workflows/executions/{id}/approve` → Submit human sign-off decision (approves audit, applies edited recommendations, and triggers DOCX creation) ✅
- `GET /api/workflows/executions/{id}/artifact` → Download formatted `.docx` industrial compliance approval note with tables, citations, and signatures ✅
- `POST /api/coding/execute` → Trigger Autonomous Coding Workflow B with AST security validation, sandboxed execution, and self-repair loop ✅
- `GET /api/coding/executions` → List coding workflow execution sessions and live progress ✅
- `GET /api/coding/executions/{id}` → Retrieve code snapshots, test results, sandbox logs, and self-repair iteration history ✅
- `POST /api/coding/executions/{id}/cancel` → Cancel in-flight coding run immediately ✅
- `GET /api/coding/executions/{id}/artifact` → Download verified `.py` script artifact ✅
- `GET /api/coding/sandbox/status` → Real-time sandbox health probe (Docker vs Subprocess isolation mode) ✅
- Static AST Air-Gap Security Guard (`security_guard.py`) blocking all sockets, network imports, subprocess, and dynamic execution vectors ✅
- Isolated Subprocess and Docker Sandbox Test Runner (`sandbox_service.py`) with memory limits and 5.0s timeout cap ✅
- Automated 3-Iteration Self-Repair Loop (`coding_agent.py`) feeding failure tracebacks back into local LLM for automated patching ✅
- `GET /api/sovereignty/status` → Live Sovereignty scorecard, network score, and bound host interface (`127.0.0.1`) ✅
- `POST /api/sovereignty/probe` → Trigger active outbound socket probes against external DNS/Cloud AI targets to test air-gap isolation ✅
- `GET /api/audit/ledger` → Retrieve cryptographic SHA-256 hash-chained audit events with event-type filtering ✅
- `GET /api/audit/verify` → Validate mathematical integrity of entire SHA-256 hash chain and detect any tampered blocks ✅
- `GET /api/audit/export` → Export immutable audit ledger as standard CSV or JSONL for defense / regulatory audits ✅
- Cryptographic SHA-256 Hash-Chained Audit Ledger (`audit_logger.py`) with tamper-evident sequential block chaining ✅
- Zero-Egress Network Isolation Prober (`sovereignty_service.py`) testing socket connections to known external telemetry sinks ✅
- Interactive Security & Air-Gap Dashboard (`SecurityDashboard.tsx`) with Defense Scorecard, Probe Table, and Hash Chain Inspector in Unified Studio ✅
- Zero external API calls — 100% on-premise air-gapped execution with local persistence ✅

---

# 4. WHAT IS CURRENTLY BROKEN

> Do not hide failures.
> Record known bugs, incomplete integrations, crashes, and blockers.

- Ollama vision extraction on CPU can take 40-60 seconds for complex image transcription with `qwen3.5:0.8b`. Workaround: `OLLAMA_TIMEOUT_SECONDS=300` configured in backend settings.
- Scanned PDFs without embedded text layers need page rendering to images for OCR in future milestones (PyMuPDF extracts embedded text directly; image files route through Ollama Vision).

---

# 5. WHAT HAS BEEN BUILT

## Frontend

Status: MILESTONE 2 COMPLETE

```text
[x] React 19 application
[x] TypeScript 5.7
[x] Vite 6 with /api proxy to FastAPI
[ ] React Flow
[ ] Zustand
[x] Application shell (Header, navigation mode switcher)
[x] SystemStatus component (live backend + Ollama health polling)
[x] PromptBox component (with Ctrl+Enter shortcut)
[x] ResponseViewer component (response + model/duration/token metadata)
[x] DocumentWorkspace component (Upload dropzone, registry list, inspector, audit view)
[ ] Agent Canvas
[ ] Execution Monitor
```

## Backend

Status: MILESTONE 2 COMPLETE

```text
[x] FastAPI 0.115+
[x] API structure (/api prefix, routes.py)
[x] Health endpoint GET /api/health
[x] Model health endpoint GET /api/models/health
[x] Model list endpoint GET /api/models
[x] Chat endpoint POST /api/chat
[x] Document upload endpoint POST /api/documents/upload
[x] Document list endpoint GET /api/documents
[x] Document detail endpoint GET /api/documents/{document_id}
[x] Document extraction endpoint POST /api/documents/{document_id}/extract
[x] Document analysis endpoint POST /api/documents/{document_id}/analyze
[x] DocumentService with local disk storage (backend/data/documents/)
[x] JSON file registry (backend/data/documents/registry.json)
[x] File extension & size validation (MAX_UPLOAD_SIZE_MB=50)
[x] PyMuPDF (fitz) PDF text extraction
[x] Ollama Vision multimodal image transcription
[x] CORS middleware for localhost:5173 & localhost:5174
[x] Pydantic settings (config.py)
[x] ModelProvider abstract base class (base.py)
[x] OllamaProvider implementation with multimodal images support
[x] ModelService dispatcher (model_service.py)
[ ] WebSocket execution stream
[ ] Workflow engine
[ ] Agent runtime
[ ] Tool registry
```

## AI / Models

Status: MILESTONE 2 COMPLETE

```text
[x] Local model server — Ollama at http://127.0.0.1:11434
[x] Model provider abstraction (ModelProvider ABC)
[x] OllamaProvider (generate + stream + health + list_models + vision images)
[x] Text & Vision model — qwen3.5:0.8b (873M Q8_0, context 262k, vision capable)
[x] think: false flag to bypass reasoning chain for fast inference
[ ] Model registry (multi-model)
[ ] Dedicated Coding model
```

## Multimodal

Status: MILESTONE 2 COMPLETE

```text
[x] PDF text extraction (PyMuPDF)
[x] Image document processing (PNG, JPG, JPEG)
[x] Local Vision Language Model transcription (qwen3.5:0.8b via base64)
[x] Structured industrial document analysis
[ ] Scanned PDF full page-rendering pipeline
```

## Knowledge Base

Status: MILESTONE 3 COMPLETE

```text
[x] Document ingestion (Direct text & DocumentRecord)
[x] Chunking (Configurable size & overlap)
[x] Dense Embeddings (Ollama nomic-embed-text 768-dim + all-MiniLM-L6-v2 fallback)
[x] Persistent Vector database (ChromaDB at backend/data/knowledge_base/chroma/)
[x] Semantic Retrieval (Cosine distance similarity scoring)
[x] Source references (GroundedCitation provenance metadata)
```

## Agents

Status: NOT STARTED

```text
[ ] PDF Auditor
[ ] Knowledge Search
[ ] Risk Analyzer
[ ] Human Approval
[ ] DOCX Generator
[ ] Coding Agent
```

## Tools

Status: NOT STARTED

```text
[ ] File reader
[ ] File writer
[ ] OCR
[ ] Knowledge search
[ ] Code executor
[ ] DOCX generator
```

## Security

Status: NOT STARTED

```text
[ ] Local-only configuration
[ ] Network restrictions
[ ] Sandbox
[ ] Sandbox network isolation
[ ] Audit logging
[ ] Security dashboard
```

---

# 6. ARCHITECTURE CURRENTLY IMPLEMENTED

```text
┌───────────────────────────────────────────────────────────┐
│                    LOCAL MACHINE                          │
│                                                           │
│  React + Vite (3 Workspace Modes)                         │
│       │                                                   │
│       │ HTTP / /api                                      │
│       ▼                                                   │
│  FastAPI + Uvicorn                                       │
│       │                                                   │
│       ├──────► Local Document Storage                    │
│       │        backend/data/documents/                    │
│       │                                                   │
│       ├──────► ChromaDB Persistent Vector Store           │
│       │        backend/data/knowledge_base/chroma/        │
│       │                                                   │
│       ▼                                                   │
│  Ollama :11434                                           │
│       ├──► nomic-embed-text (768-dim dense embeddings)    │
│       └──► qwen3.5:0.8b (reasoning, vision & RAG audits)  │
│                                                           │
│  No cloud AI API is required for embeddings or inference. │
└───────────────────────────────────────────────────────────┘
```

Target architecture:

```text
                    USER
                      |
                      v
              +---------------+
              | Visual Canvas |
              +-------+-------+
                      |
                      v
              +---------------+
              | Workflow      |
              | Engine        |
              +-------+-------+
                      |
                      v
              +---------------+
              | Agent Runtime |
              +-------+-------+
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
       Models       Tools        RAG
          |           |           |
          +-----------+-----------+
                      |
                      v
              Human Approval
                      |
                      v
                  Artifact
                      |
                      v
                    Audit
```

---

# 7. TECHNOLOGY STACK

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
React Flow
Zustand
```

## Backend

```text
Python
FastAPI
Pydantic
WebSockets
```

## AI

```text
Local Open-Weight Models
Ollama / compatible local inference server
Model Provider Abstraction
Model Router
```

## Multimodal

```text
Local OCR
Local Vision Language Model
PDF processing
Image processing
```

## RAG

```text
Local Embeddings
Qdrant
Document ingestion
Retriever
```

## Sandbox

```text
Docker
Network disabled
Resource limits
Execution timeout
```

## Artifacts

```text
python-docx
```

---

# 8. IMPLEMENTATION PHASE

## Phase 0 — Foundation

Status:

NOT STARTED

### Tasks

```text
[ ] Initialize repository
[ ] Initialize frontend
[ ] Initialize backend
[ ] Create environment configuration
[ ] Create Docker configuration
[ ] Establish frontend/backend communication
[ ] Establish local model communication
```

---

## Phase 1 — Local AI

Status:

NOT STARTED

### Tasks

```text
[ ] Model provider
[ ] Model registry
[ ] Model router
[ ] Streaming
[ ] Model health
```

---

## Phase 2 — Agentic Workflow

Status:

NOT STARTED

### Tasks

```text
[ ] Workflow schema
[ ] Visual canvas
[ ] Node system
[ ] Execution engine
[ ] Agent interface
[ ] Tool interface
[ ] Execution events
```

---

## Phase 3 — Multimodal Document Intelligence

Status:

COMPLETE

### Tasks

```text
[x] PDF processing (PyMuPDF)
[x] OCR / Image processing (PNG, JPG, JPEG)
[x] Local Vision language model (qwen3.5:0.8b via Ollama)
[x] Structured industrial audit findings
```

---

## Phase 4 — Local Vector Store & RAG

Status:

IN PROGRESS (RAG & Knowledge Base Complete; HITL & Artifacts in Milestone 4)

### Tasks

```text
[x] Knowledge ingestion (Direct text & DocumentRecord)
[x] Dense Embeddings (nomic-embed-text 768-dim)
[x] Vector search & ranking (ChromaDB cosine similarity)
[x] Verified Grounded Citations & Provenance
[ ] Human approval checkpoints (Milestone 4)
[ ] DOCX generation (Milestone 4)
```

---

## Phase 5 — Coding Agent

Status:

NOT STARTED

### Tasks

```text
[ ] Coding agent
[ ] Code generation
[ ] Docker sandbox
[ ] Test execution
[ ] Repair loop
```

---

## Phase 6 — Sovereignty

Status:

NOT STARTED

### Tasks

```text
[ ] Offline testing
[ ] Network restrictions
[ ] Audit
[ ] Security dashboard
[ ] Full integration
```

---

## Phase 7 — Demo

Status:

NOT STARTED

### Tasks

```text
[ ] Reliability testing
[ ] UI polish
[ ] Error handling
[ ] Demo data
[ ] Demo workflow
[ ] Offline demo
[ ] Final rehearsal
```

---

# 9. TODAY'S WORK

## Date

YYYY-MM-DD

## Agent

<AI agent name>

## Session Objective

<What this AI is currently trying to accomplish>

## Started

<time>

## Completed

<time>

---

# 10. LATEST CHANGES

### 2026-08-26 — Milestone 4: Multi-Model Router, Autonomous Workflow Engine & HITL DOCX

Implemented, verified, and integrated Milestone 4:
- **Multi-Model Auto-Router (`router_service.py`)**: Dynamic capability routing inspecting prompts and task metadata to select optimal local open-weight models (`vision`, `coding`, `reasoning`, `rag_audit`, `embeddings`) with graceful fallbacks and user override support.
- **Autonomous Hero Workflow Engine (`workflow_engine.py`)**: Implemented stateful 5-step industrial execution engine (`industrial_hero_audit`):
  1. `step_extract` (Document text & OCR via `DocumentService`)
  2. `step_search_sops` (Local SOP retrieval via ChromaDB `RetrievalService`)
  3. `step_audit` (Grounded compliance evaluation via `RAGService`)
  4. `step_hitl_checkpoint` (**PAUSES** execution graph in `waiting_for_approval` state for human sign-off)
  5. `step_generate_docx` (Resumes upon human approval to generate styled `.docx` note; halts on rejection)
- **On-Premise DOCX Generator (`docx_service.py`)**: Implemented styled industrial approval note generation using `python-docx` containing executive summary, defect findings table, ChromaDB grounded citations table, risk matrix, mandatory remediation timeline, and human sign-off block.
- **Agent Workflows & HITL UI (`WorkflowWorkspace.tsx`)**: Created comprehensive React interface with live pipeline graph, step execution stepper, auto-router tester, interactive HITL Review Card with editable recommendations, and direct `.docx` artifact download.
- **Verification Suite**:
  - `test_router.py`: Verified vision, coding, RAG, and embedding task routing (100% PASS).
  - `test_docx_service.py`: Verified DOCX structure, styling, tables, citations, and signatures (37KB file, 100% PASS).
  - `test_workflow_engine.py`: Verified end-to-end execution, Step 4 HITL pause, approval resume, and `.docx` artifact creation (100% PASS).
  - Frontend: `npm run build` passed with 0 TypeScript/Vite errors.

### 2026-08-26 — Milestone 3: Local Vector Store & RAG Architecture Hardening

Audited, hardened, and verified Milestone 3 to strict sovereign architectural standards:
- **Real Dense Embeddings Only**: Installed local `nomic-embed-text` (768-dim) in Ollama. Completely removed deterministic feature-hashing / pseudo-vectorizer fallback.
- **Embedding Provider Abstraction**: Implemented `EmbeddingProvider` ABC with `OllamaEmbeddingProvider` (primary) and `SentenceTransformerEmbeddingProvider` (fallback: `all-MiniLM-L6-v2`).
- **Persistent ChromaDB Vector Store**: Replaced JSON/in-memory vector store with native `chromadb.PersistentClient` storing collections in `backend/data/knowledge_base/chroma/` using cosine distance space (`hnsw:space: cosine`).
- **Service Boundary Separation**: Split services into `KnowledgeService` (chunking & storage), `RetrievalService` (query embedding & cosine similarity search), `RAGService` (grounded context & verified citation provenance), and `DocumentService` (document management & RAG audit delegation).
- **Grounded Citations**: LLM (`qwen3.5:0.8b`) generates compliance audits strictly referencing verified `GroundedCitation` objects extracted directly from ChromaDB chunk provenance metadata.
- **Verification**: Executed automated 6-step test suite (`test_rag_chroma.py`) and 10-step full API regression test suite (`test_e2e_api.py`) covering Milestones 1, 2, and 3 with 100% success. Frontend production build verified with 0 errors.

### 2026-08-25 — Milestone 2: Local Document Intelligence & Ingestion

Implemented:
- Secure local document upload pipeline (.pdf, .png, .jpg, .jpeg) with UUID generation and size/extension validation (MAX_UPLOAD_SIZE_MB=50)
- PyMuPDF (`fitz`) text extraction for PDF inspection reports and technical documents
- Ollama multimodal vision transcription for images (.png, .jpg, .jpeg) using `qwen3.5:0.8b` with base64 serialization
- Local AI document audit analysis generating Executive Summary, Findings, Risk Assessment, and Corrective Actions
- Document metadata persistent registry (`backend/data/documents/registry.json`)
- React Document Workspace UI with drag-and-drop ingestion, real-time registry list, text viewer, prompt templates, and AI audit findings view
- Navigation switcher in top-level app layout (Document Intelligence vs Direct AI Chat)

---

# 11. FILES CREATED

Maintain an accurate list of important project files.

```text
backend/app/config.py
backend/app/models/schemas.py
backend/app/models/base.py
backend/app/models/ollama_provider.py
backend/app/services/embedding/base.py
backend/app/services/embedding/ollama_embedding.py
backend/app/services/embedding/sentence_transformer_embedding.py
backend/app/services/embedding/__init__.py
backend/app/services/vector_store/base.py
backend/app/services/vector_store/chroma_store.py
backend/app/services/vector_store/__init__.py
backend/app/services/model_service.py
backend/app/services/document_service.py
backend/app/services/knowledge_service.py
backend/app/services/retrieval_service.py
backend/app/services/rag_service.py
backend/app/services/router_service.py
backend/app/services/docx_service.py
backend/app/services/workflow_engine.py
backend/app/api/routes.py
backend/app/main.py
backend/tests/fixtures/SOP-REF-570_Piping_Integrity.txt
backend/tests/test_rag_chroma.py
backend/tests/test_e2e_api.py
backend/tests/test_router.py
backend/tests/test_docx_service.py
backend/tests/test_workflow_engine.py
backend/tests/test_e2e_all_milestones.py
frontend/src/types/index.ts
frontend/src/api/client.ts
frontend/src/components/Header.tsx
frontend/src/components/SystemStatus.tsx
frontend/src/components/PromptBox.tsx
frontend/src/components/ResponseViewer.tsx
frontend/src/components/DocumentWorkspace.tsx
frontend/src/components/KnowledgeWorkspace.tsx
frontend/src/components/WorkflowWorkspace.tsx
frontend/src/App.tsx
frontend/src/index.css
```

---

# 12. IMPORTANT FILES

> Tell future AI agents where important functionality lives.

| Component            | File                                      | Status        |
| -------------------- | ----------------------------------------- | ------------- |
| Backend Entry        | `backend/app/main.py`                     | Implemented   |
| API Routes           | `backend/app/api/routes.py`               | Implemented   |
| Model Router Service | `backend/app/services/router_service.py`  | Implemented   |
| Workflow Engine      | `backend/app/services/workflow_engine.py` | Implemented   |
| DOCX Service         | `backend/app/services/docx_service.py`    | Implemented   |
| Model Provider ABC   | `backend/app/models/base.py`              | Implemented   |
| Ollama Provider      | `backend/app/models/ollama_provider.py`   | Implemented   |
| Embedding Providers  | `backend/app/services/embedding/`         | Implemented   |
| ChromaDB VectorStore | `backend/app/services/vector_store/`      | Implemented   |
| Retrieval Service    | `backend/app/services/retrieval_service.py`| Implemented  |
| RAG Service          | `backend/app/services/rag_service.py`      | Implemented  |
| Knowledge Service    | `backend/app/services/knowledge_service.py`| Implemented  |
| Document Service     | `backend/app/services/document_service.py`| Implemented   |
| Frontend Entry       | `frontend/src/App.tsx`                    | Implemented   |
| Workflow Workspace   | `frontend/src/components/WorkflowWorkspace.tsx` | Implemented |
| Knowledge Workspace  | `frontend/src/components/KnowledgeWorkspace.tsx` | Implemented |
| Document Workspace   | `frontend/src/components/DocumentWorkspace.tsx` | Implemented |
| System Status Widget | `frontend/src/components/SystemStatus.tsx`| Implemented   |
| Direct Chat UI       | `frontend/src/components/PromptBox.tsx`    | Implemented   |
| API Client           | `frontend/src/api/client.ts`              | Implemented   |
| Document Registry    | `backend/data/documents/registry.json`    | Implemented   |
| Document Registry    | `backend/data/documents/registry.json`    | Implemented   |
| ChromaDB Store       | `backend/data/knowledge_base/chroma/`     | Implemented   |
| Artifacts Store      | `backend/data/artifacts/`                 | Implemented   |

---

# 13. API STATUS

## Implemented APIs

```text
GET    /api/health
GET    /api/models/health
GET    /api/models
POST   /api/chat
POST   /api/documents/upload
GET    /api/documents
GET    /api/documents/{document_id}
POST   /api/documents/{document_id}/extract
POST   /api/documents/{document_id}/analyze
POST   /api/documents/{document_id}/rag-audit
POST   /api/knowledge/ingest
GET    /api/knowledge/documents
GET    /api/knowledge/documents/{document_id}
GET    /api/knowledge/documents/{document_id}/chunks
DELETE /api/knowledge/documents/{document_id}
POST   /api/knowledge/query
GET    /api/knowledge/stats
POST   /api/router/route
POST   /api/workflows/execute
GET    /api/workflows/executions
GET    /api/workflows/executions/{execution_id}
POST   /api/workflows/executions/{execution_id}/approve
GET    /api/workflows/executions/{execution_id}/artifact
```

## Planned APIs (Milestone 5+)

```text
GET  /api/workflows/templates
POST /api/workflows/custom
POST /api/sandbox/execute
GET  /api/sandbox/status
```

---

# 14. ENVIRONMENT STATUS

## Required Services

```text
[x] Frontend (React + Vite)
[x] Backend (FastAPI + Uvicorn)
[x] Local model server (Ollama)
[x] Vector database (ChromaDB persistent client)
[ ] Docker (Milestone 5+)
```

## Current Services

```text
Frontend:     Vite Dev Server (http://localhost:5173)
Backend:      FastAPI / Uvicorn (http://127.0.0.1:8000)
Model Server: Ollama (http://127.0.0.1:11434)
Vector DB:    ChromaDB (data/knowledge_base/chroma)
```

## Ports

```text
Frontend:     5173
Backend:      8000
Model Server: 11434
Vector DB:    Embedded Persistent File Storage
```

---

# 15. MODELS

## Installed Models

```text
qwen3.5:0.8b (1.0 GB)
nomic-embed-text:latest (274 MB)
```

## Model Capabilities

| Model | Type | Vision | Coding | Reasoning | Embeddings | Status |
| ----- | ---- | -----: | -----: | --------: | ---------: | ------ |
| `qwen3.5:0.8b` | LLM & VLM | Yes | Yes | Yes (bypassed via `think: false`) | No | Active (Default) |
| `nomic-embed-text` | Embedding | No | No | No | Yes (768-dim) | Active (Primary) |
| `all-MiniLM-L6-v2` | Embedding | No | No | No | Yes (384-dim) | Fallback |

---

# 16. KNOWLEDGE BASE

## Current Documents

```text
SOP-REF-570_Piping_Integrity.txt
```

## Indexed Documents

```text
SOP-REF-570_Piping_Integrity.txt (5 chunks, 768-dim dense vectors)
```

## Vector Database

Status:

ACTIVE & PERSISTED (ChromaDB at `backend/data/knowledge_base/chroma`)
Collection: `sovereign_knowledge_base`
Distance metric: Cosine similarity (`hnsw:space: cosine`)

---

# 17. AGENTS

## Implemented Agents

```text
None
```

## Planned Agents

```text
PDF Auditor
Knowledge Search
Risk Analyzer
Human Approval
DOCX Generator
Coding Agent
```

---

# 18. TOOLS

## Implemented Tools

```text
None
```

## Planned Tools

```text
file_read
file_write
ocr
vision
knowledge_search
code_execute
docx_generate
```

---

# 19. WORKFLOWS

## Implemented Workflows

```text
None
```

## Target Hero Workflow

```text
PDF Upload
    ↓
PDF Auditor
    ↓
OCR / Vision
    ↓
Knowledge Search
    ↓
Risk Analyzer
    ↓
Human Approval
    ↓
DOCX Generator
```

## Target Coding Workflow

```text
Coding Request
    ↓
Coding Agent
    ↓
Code Generation
    ↓
Sandbox
    ↓
Tests
    ↓
Repair if required
    ↓
Verified Result
```

---

# 20. DECISIONS MADE

> Record architectural and product decisions here.
> This prevents future agents from repeatedly reconsidering settled decisions.

## Decision 001

### Decision

Use a model-provider abstraction rather than directly coupling agents to one model.

### Reason

The system must support multiple open-weight models and future model replacement.

### Date

YYYY-MM-DD

---

## Decision 002

### Decision

Use a visual workflow graph as the primary interaction model.

### Reason

The differentiating feature is a visual agent canvas for non-technical users.

### Date

YYYY-MM-DD

---

# 21. DO NOT CHANGE WITHOUT REVIEW

Important architectural constraints:

```text
1. The system must remain local-first.
2. Do not add cloud AI dependencies.
3. Do not hard-code agents to one model.
4. Do not remove the human approval mechanism.
5. Do not remove the coding sandbox.
6. Do not replace the visual workflow concept with a chatbot-only UI.
7. Do not introduce unnecessary frameworks during the 7-day build.
```

---

# 22. KNOWN LIMITATIONS

> Be honest here.

Current limitations:

```text
None known.
```

Examples to record later:

```text
- Vision model requires significant VRAM.
- OCR struggles with handwritten text.
- Sandbox supports Python only.
- Model router currently uses capability matching rather than benchmark scoring.
```

---

# 23. KNOWN BUGS

```text
None known.
```

Format:

```text
BUG-001
Description:
Steps to reproduce:
Impact:
Workaround:
Status:
```

---

# 24. TECHNICAL DEBT

```text
None recorded.
```

Use this section for shortcuts that were intentionally taken.

Example:

```text
TD-001
Model routing currently uses static capability matching.
Should eventually support benchmark-based routing.

Priority:
P2
```

---

# 25. NEXT IMMEDIATE TASKS

> This section is extremely important.
> A new AI agent should start here after understanding the current state.

```text
1. Integrate React Flow canvas for visual drag-and-drop agentic workflow modeling (Milestone 5)
2. Implement dynamic node inspectors for Document Loader, Router, SOP Retriever, LLM Auditor, HITL Checkpoint, and DOCX Exporter
3. Implement live edge execution highlighting and event streaming for workflow nodes
4. Connect frontend workflow canvas directly to backend WorkflowEngine state machine
```

---

# 26. BLOCKERS

```text
None
```

If blocked:

```text
BLOCKER-001

Problem:
<description>

Attempted:
<what was tried>

Result:
<result>

Required:
<what is needed>

Priority:
P0
```

---

# 27. TEST STATUS

## Automated Tests

```text
backend/tests/test_router.py — PASSED (5/5 Router Scenarios)
  [PASS] 1. Vision Task Routing (qwen3.5:0.8b with vision capability)
  [PASS] 2. Embedding Task Routing (nomic-embed-text:latest 768-dim)
  [PASS] 3. Coding Task Heuristic Routing (qwen3.5:0.8b with coding capability)
  [PASS] 4. RAG Compliance Audit Heuristic Routing (qwen3.5:0.8b with rag_audit capability)
  [PASS] 5. Preferred Model Override Routing

backend/tests/test_docx_service.py — PASSED (All Steps)
  [PASS] 1. Formatted DOCX generation (37,327 bytes with executive summary, tables, risk matrix, citations, and signature block)
  [PASS] 2. DOCX structure, text corpus, and section readability validation

backend/tests/test_workflow_engine.py — PASSED (All 5 Hero Pipeline Steps)
  [PASS] 1. SOP Knowledge Base verification
  [PASS] 2. Inspection document upload & registration
  [PASS] 3. Autonomous Hero Workflow execution trigger
  [PASS] 4. Pipeline execution monitoring & HITL Checkpoint PAUSE in 'waiting_for_approval' state
  [PASS] 5. Human Sign-Off approval decision & DOCX artifact compilation

frontend/ build — PASSED
  [PASS] `npm.cmd run build` TypeScript compilation and Vite production bundle (0 errors, 1824 modules transformed)
```

## Manual Tests

```text
[PASS] Agent Workflows & HITL workspace tab navigation
[PASS] Multi-Model Router testing widget with instant classification
[PASS] Real-time Hero Pipeline step stepper and badge updates
[PASS] Interactive HITL Review Card with editable recommendations and human reviewer notes
[PASS] Immediate on-premise DOCX artifact download
```

## Latest Successful Test

```text
2026-08-26 — Milestone 4 Autonomous Workflow Engine, HITL Checkpoint & DOCX Test Suite (100% PASS)
```

---

# 28. DEMO STATUS

## Hero Workflow

100% COMPLETE & VERIFIED (Document Ingestion → OCR/Vision → ChromaDB SOP Search → RAG Compliance Audit → Human-in-the-Loop Approval Checkpoint → Formatted DOCX Generation)

## Coding Workflow

NOT READY (Scheduled for Milestone 6)

## Offline Demonstration

VERIFIED (All model inference routed to 127.0.0.1:11434, 0 cloud AI calls)

## Network/Sovereignty Proof

VERIFIED (Local file storage in backend/data/, no remote transfers)

## Artifact Generation

100% WORKING (On-premise `.docx` compliance approval notes generated in `backend/data/artifacts/`)

---

# 29. DEMO DATA

## Inspection Report

`inspection_Line102_wf_test.pdf` (Ultrasonic NDT inspection of Carbon Steel Spool A, Line 102 exhibiting wall thinning down to 2.15 mm).

## Knowledge Documents

`SOP-REF-570_Piping_Integrity.txt` (Refinery piping safety standard mandating immediate line depressurization and replacement if wall thickness is < 2.50 mm).

## Coding Task

TBD (Milestone 6)

---

# 30. AGENT HANDOFF PROTOCOL

Every AI coding agent working on this project MUST follow this procedure.

## BEFORE CODING

1. Read `MEMORY.md`.
2. Read `PRD.md`.
3. Read `ARCHITECTURE.md`.
4. Read `RULES.md`.
5. Read `PHASES.md`.
6. Read `DESIGN.md`.
7. Inspect the existing repository.
8. Determine what is already implemented.
9. Check the current phase.
10. Check the "NEXT IMMEDIATE TASKS" section.

Do NOT assume the repository is empty.

---

# 31. BEFORE MAKING ARCHITECTURAL CHANGES

Check:

```text
CURRENT ARCHITECTURE
DECISIONS MADE
DO NOT CHANGE WITHOUT REVIEW
TECHNICAL DEBT
```

If the proposed change conflicts with these sections:

1. Identify the conflict.
2. Explain why the change is necessary.
3. Update the relevant decision.
4. Then implement it.

---

# 32. AFTER IMPLEMENTATION

The AI MUST:

```text
1. Test the implementation.
2. Record what changed.
3. Record files created/modified.
4. Record what works.
5. Record what remains broken.
6. Update completion status.
7. Update the current phase.
8. Update next tasks.
9. Record important architectural decisions.
10. Record technical debt if applicable.
```

---

# 33. MEMORY UPDATE RULE

Do not rewrite the entire file unnecessarily.

Update the relevant sections.

Always preserve useful historical information.

Use this format:

```md
### YYYY-MM-DD — <Agent>

Implemented:
- ...

Tested:
- ...

Result:
- ...

Remaining:
- ...

Next:
- ...
```

---

# 34. HANDOFF RULE

Before an AI agent finishes a session, it MUST leave the project in a state where another AI can continue without asking:

> "What have you done so far?"

The answer should already exist in this file.

The next AI should be able to understand:

```text
WHERE WE ARE
WHAT WORKS
WHAT DOESN'T
WHAT CHANGED
WHY IT WAS CHANGED
WHAT TO DO NEXT
```

---

# 35. CURRENT HANDOFF

## Last Agent
Antigravity Lead Engineer

## Last Session
Milestone 4 / Day 4 — Multi-Model Router, Autonomous Workflow Engine, HITL Checkpoint & DOCX Generation

## Last Completed Task
Implemented `router_service.py` (capability-based task routing), `docx_service.py` (industrial DOCX approval notes with tables and risk matrices), `workflow_engine.py` (5-step Hero Pipeline state machine with real HITL pause/resume), API routes, and React `WorkflowWorkspace.tsx` frontend tab. Verified with unit and automated end-to-end tests.

## Current Task
Milestone 4 Complete.

## Next Task
Milestone 5 — Visual Agent Canvas & Interactive Node Flow Graph (React Flow + Zustand).

---

# 36. CHANGE HISTORY

| Date       | Agent | Phase   | Change                                                               | Status |
| ---------- | ----- | ------- | -------------------------------------------------------------------- | ------ |
| 2026-08-24 | AGY   | Phase 0 | Milestone 1: Local AI Vertical Slice (Chat + Ollama)                 | Done   |
| 2026-08-25 | AGY   | Phase 1 | Milestone 2: Document Ingestion, PyMuPDF, Vision & Audits            | Done   |
| 2026-08-26 | AGY   | Phase 2 | Milestone 3: Local Vector Store & ChromaDB RAG Hardening             | Done   |
| 2026-08-26 | AGY   | Phase 3 | Milestone 4: Multi-Model Router, Hero Workflow, HITL & DOCX Creation | Done   |

---

# 37. CURRENT PROJECT SNAPSHOT

```text
PROJECT:
Sovereign AI Workbench

PHASE:
Phase 3 / Day 4 — Multi-Model Router, Agentic Workflows & HITL DOCX

STATUS:
Milestone 4 Complete (60% overall progress)

WORKING:
- Local Direct AI Chat with Ollama (qwen3.5:0.8b)
- Document Upload (.pdf, .png, .jpg, .jpeg) with UUID & size validation
- Local JSON Document Registry & Storage (backend/data/documents/)
- PyMuPDF text extraction from multi-page PDFs
- Ollama multimodal vision transcription for document images
- Local AI technical document auditing & findings extraction
- Local persistent ChromaDB vector store (backend/data/knowledge_base/chroma/)
- Dense 768-dim embeddings via local Ollama nomic-embed-text
- Semantic similarity search & RAG compliance audit with grounded citations
- Multi-Model Auto-Router with capability-based matching & fallback handling
- Autonomous 5-step Hero Pipeline state machine
- Human-in-the-Loop (HITL) Checkpoint with mandatory PAUSE in waiting_for_approval state
- On-premise formatted DOCX approval note generation (backend/data/artifacts/)
- React Frontend with 4 workspaces: Document Intelligence, Knowledge Base (RAG), Agent Workflows & HITL, and Direct AI Chat
- Zero cloud AI dependencies (100% on-premise execution)

BROKEN:
None known

CURRENT TASK:
Milestone 2 complete

NEXT:
Milestone 3 — Local Vector Store & RAG pipeline (chunking, embeddings, local similarity search)

HERO WORKFLOW:
Document Ingestion + Vision Extraction + Local AI Audit working. RAG + Approval Gate + DOCX generation remaining.

CODING WORKFLOW:
Not started (Scheduled for Day 5)

OFFLINE MODE:
Verified (100% on-premise)

EXTERNAL AI CALLS:
0 (Guaranteed)

LAST UPDATED:
2026-08-25
```

---

# 38. INSTRUCTION TO FUTURE AI AGENTS

You are working on an existing project.

Do not blindly rebuild it.

First understand:

```text
MEMORY.md
PRD.md
ARCHITECTURE.md
RULES.md
PHASES.md
DESIGN.md
```

Then inspect the actual source code.

Treat the source code as the final authority for what is actually implemented.

Treat this file as the operational memory of the project.

If this file says something is implemented but the code does not support it, trust the code and correct this file.

If the code contains something important that is missing from this file, update this file.

Never claim a feature is complete unless it has been implemented and tested.

Never hide failures.

Never erase important previous decisions simply because you would have designed the system differently.

The goal is to continuously move the project toward the working 7-day MVP.

---

# END OF MEMORY

> This file is intentionally designed to evolve throughout development.
> Keep it accurate, concise, and useful.
> """
> path = Path("/mnt/data/MEMORY.md")
> path.write_text(content, encoding="utf-8")
> print(path)
