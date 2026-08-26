# Sovereign AI Workbench

> Air-gapped, on-premise, multimodal agentic AI workbench for sensitive industrial, defense, PSU, and government workflows.

## Current Status

| Milestone | Status |
|---|:---:|
| Milestone 1 — Local AI Vertical Slice | COMPLETE |
| Milestone 2 — Local Document Intelligence & Ingestion | COMPLETE |
| Milestone 3 — Local Vector Store & RAG | COMPLETE |
| Milestone 4 — Multi-Model Router & HITL Approval Note | NEXT |

The current system provides a working local pipeline:

```text
React Frontend
      ↓
FastAPI Backend
      ↓
Ollama (qwen3.5:0.8b & nomic-embed-text) + ChromaDB
      ↓
Grounded RAG Compliance Audits & Semantic Search
      ↓
React Frontend
```

Document and Knowledge workflows are fully implemented:

```text
Confidential PDF / Image / Technical SOPs
    ↓
Local Storage & ChromaDB Persistent Vector Store
    ↓
PyMuPDF / Ollama Vision & Dense 768-dim Embeddings
    ↓
Local Semantic Retrieval & Cosine Similarity Ranking
    ↓
Local RAG-Grounded AI Compliance Audit (qwen3.5:0.8b)
    ↓
Audit Findings with Verified Source SOP Citations
```

---

# Features

## Milestone 1

- React + TypeScript frontend
- FastAPI backend
- Ollama integration
- `qwen3.5:0.8b` local model
- Model-provider abstraction
- Backend/model health checks
- Direct AI chat
- Industrial control-room UI
- Local inference

## Milestone 2

- PDF upload
- PNG/JPG/JPEG upload
- File validation
- UUID-based document IDs
- Local document storage
- Persistent `registry.json`
- PDF text extraction using PyMuPDF
- Image/scanned-document understanding through Ollama Vision
- Local AI document auditing
- Risk-oriented analysis
- Document registry UI
- Extracted-content inspector
- Audit prompt templates
- Invalid-file rejection
- Missing-document handling

## Milestone 3

- Persistent local vector database (**ChromaDB** at `backend/data/knowledge_base/chroma/`)
- Real dense embedding provider (**`nomic-embed-text`**, 768 dimensions via local Ollama `/api/embeddings`)
- Local fallback embedding engine (`all-MiniLM-L6-v2` via SentenceTransformers)
- Deterministic text chunking engine with configurable chunk size & overlap
- Fast cosine similarity semantic vector search with top-K ranking and score thresholding
- RAG-grounded compliance audits evaluating inspection reports strictly against organizational standards/SOPs
- Verified Grounded Citations linking audit conclusions to source standard filenames, pages, and chunk IDs
- Knowledge Workspace UI with SOP repository manager, chunk inspector, and interactive semantic search playground
- Grounded SOP citation cards in Document Workspace with similarity match percentages
- 100% on-premise execution with zero cloud calls

---

# Architecture

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
│   │   │   ├── document_service.py
│   │   │   ├── knowledge_service.py
│   │   │   ├── model_service.py
│   │   │   ├── rag_service.py
│   │   │   └── retrieval_service.py
│   │   ├── config.py
│   │   └── main.py
│   ├── data/
│   │   ├── documents/
│   │   │   └── registry.json
│   │   └── knowledge_base/
│   │       └── chroma/
│   ├── tests/
│   │   ├── fixtures/
│   │   │   └── SOP-REF-570_Piping_Integrity.txt
│   │   ├── test_rag_chroma.py
│   │   └── test_e2e_api.py
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
│   │   │   └── SystemStatus.tsx
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
qwen3.5:0.8b (LLM reasoning & Vision)
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
ollama pull qwen3.5:0.8b
ollama pull nomic-embed-text
```

Verify installed models:

```cmd
ollama list
```

You should see:

```text
nomic-embed-text:latest
qwen3.5:0.8b
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
DEFAULT_MODEL=qwen3.5:0.8b
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
qwen3.5:0.8b
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

---

# Verification Status

Milestones 1, 2, and 3 have been verified with automated end-to-end regression test suites.

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
| Frontend TypeScript & Vite production build | PASS |

**20/20 verification tests passed.**

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
Milestone 4 — Multi-Model Router & HITL Approval   [NEXT]
        ↓
Milestone 5 — Visual Agent Canvas
        ↓
Milestone 6 — Sandboxed Tool Execution Loop
        ↓
Milestone 7 — Security & Air-Gap Verification
        ↓
Final Hackathon Demonstration
```

---

# Next Milestone — Multi-Model Router & HITL Approval Note (Milestone 4)

Planned capabilities include:
1. **Multi-Model Auto-Router**: Routing requests dynamically based on task type.
2. **Agentic Tool Execution Loop**: Multi-step reasoning: Extract $\rightarrow$ Search $\rightarrow$ Audit $\rightarrow$ Draft.
3. **Human-in-the-Loop (HITL) Approval Checkpoint**: Pausing workflows for human sign-off.
4. **DOCX Approval Note Generator**: Generating structured `.docx` inspection approval notes on-premise.

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
ollama pull qwen3.5:0.8b
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
