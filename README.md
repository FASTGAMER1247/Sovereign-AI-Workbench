# Sovereign AI Workbench

> Air-gapped, on-premise, multimodal agentic AI workbench for sensitive industrial, defense, PSU, and government workflows.

## Current Status

| Milestone | Status |
|---|:---:|
| Milestone 1 — Local AI Vertical Slice | COMPLETE |
| Milestone 2 — Local Document Intelligence & Ingestion | COMPLETE |
| Milestone 3 — Local RAG | NEXT |

The current system provides a working local pipeline:

```text
React Frontend
      ↓
FastAPI Backend
      ↓
Ollama
      ↓
qwen3.5:0.8b
      ↓
FastAPI
      ↓
React Frontend
```

Document workflows are also implemented:

```text
PDF / Image
    ↓
Local Storage
    ↓
Extraction
    ↓
Local Ollama Analysis
    ↓
Audit Findings
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

---

# Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    LOCAL MACHINE                          │
│                                                           │
│  React + Vite                                             │
│       │                                                   │
│       │ HTTP / /api                                      │
│       ▼                                                   │
│  FastAPI + Uvicorn                                       │
│       │                                                   │
│       ├──────► Local Document Storage                    │
│       │        backend/data/documents/                    │
│       │                                                   │
│       ▼                                                   │
│  Ollama :11434                                           │
│       │                                                   │
│       ▼                                                   │
│  qwen3.5:0.8b                                            │
│                                                           │
│  No cloud AI API is required for inference.              │
└───────────────────────────────────────────────────────────┘
```

The frontend communicates with FastAPI only. FastAPI communicates with Ollama and local storage.

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
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── document_service.py
│   │   │   └── model_service.py
│   │   ├── config.py
│   │   └── main.py
│   ├── data/
│   │   └── documents/
│   │       └── registry.json
│   ├── .env.example
│   ├── requirements.txt
│   └── .venv/                 # local only, NOT committed
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   └── DocumentWorkspace.tsx
│   │   ├── types/
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
qwen3.5:0.8b
```

A GPU is recommended for practical performance, although the current development model can run on CPU.

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

Pull the model:

```cmd
ollama pull qwen3.5:0.8b
```

Verify:

```cmd
ollama list
```

You should see:

```text
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

Then:

```cmd
curl.exe http://127.0.0.1:8000/api/models/health
```

The model-health response should indicate that:

```text
provider = ollama
default_model = qwen3.5:0.8b
is_model_available = true
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

or, if that port is occupied:

```text
http://localhost:5174/
```

Use the exact URL printed by Vite.

---

# Running the Complete System

You normally need:

### Terminal 1 — Ollama

Ollama running with:

```text
qwen3.5:0.8b
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

The request follows:

```text
Browser
  ↓
React
  ↓
FastAPI /api/chat
  ↓
Model Provider
  ↓
Ollama
  ↓
qwen3.5:0.8b
  ↓
FastAPI
  ↓
React
```

---

# Document Intelligence

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
Validation
  ↓
UUID assignment
  ↓
Local storage
  ↓
Document registry
  ↓
Extraction
  ↓
Local AI analysis
```

Documents are stored locally at:

```text
backend/data/documents/
```

Metadata is stored in:

```text
backend/data/documents/registry.json
```

---

# PDF Workflow

1. Open **Document Intelligence**.
2. Upload a PDF.
3. Select the document.
4. Click **Extract Text**.
5. PyMuPDF extracts text from text-based PDFs.
6. Select an audit template or enter a custom prompt.
7. Run the audit.
8. The local Ollama model analyzes the extracted content.

Example:

```text
Identify the highest-risk component and state the immediate required action.
```

---

# Image / Scanned Document Workflow

Upload a PNG, JPG, or JPEG.

The current pipeline is:

```text
Image
  ↓
Local FastAPI backend
  ↓
Base64 serialization
  ↓
Ollama Vision
  ↓
qwen3.5:0.8b
  ↓
Extracted/transcribed content
  ↓
Local AI audit
```

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

## Documents

```text
POST /api/documents/upload
GET  /api/documents
GET  /api/documents/{id}
POST /api/documents/{id}/extract
POST /api/documents/{id}/analyze
```

---

# Example API Tests

## Upload

```cmd
curl.exe -X POST "http://127.0.0.1:8000/api/documents/upload" -F "file=@test.pdf"
```

## List

```cmd
curl.exe "http://127.0.0.1:8000/api/documents"
```

## Extract

```cmd
curl.exe -X POST "http://127.0.0.1:8000/api/documents/<DOCUMENT_ID>/extract"
```

## Analyze

```cmd
curl.exe -X POST "http://127.0.0.1:8000/api/documents/<DOCUMENT_ID>/analyze" -H "Content-Type: application/json" -d "{"prompt":"Identify the highest risk component and state the immediate required action."}"
```

---

# Model Notes

The current development model is:

```text
qwen3.5:0.8b
```

It supports reasoning/thinking.

The application disables thinking for normal inference using:

```text
think: false
```

This was necessary because unrestricted reasoning caused simple requests to generate thousands of additional tokens and become extremely slow on CPU.

---

# Git / Team Development

Do not commit generated or machine-specific files:

```text
backend/.venv/
backend/.env
frontend/node_modules/
__pycache__/
*.pyc
```

These are recreated on each developer's machine.

Do commit:

```text
DOCS/
backend/app/
backend/requirements.txt
backend/.env.example
frontend/src/
frontend/package.json
frontend/package-lock.json
frontend/vite.config.ts
README.md
```

## Recommended Team Workflow

Before starting work:

```cmd
git pull --rebase origin main
```

After making changes:

```cmd
git add .
git commit -m "Describe your changes"
git pull --rebase origin main
git push origin main
```

Avoid `git push --force` on `main`.

---

# Verification Status

Milestone 2 was tested from the perspective of a fresh user.

| Test | Result |
|---|:---:|
| Backend health | PASS |
| Ollama model availability | PASS |
| PDF upload | PASS |
| PDF text extraction | PASS |
| PDF AI audit | PASS |
| Image upload | PASS |
| Multimodal vision extraction | PASS |
| Image AI audit | PASS |
| Document registry | PASS |
| Direct AI chat | PASS |
| Invalid extension rejection | PASS |
| Missing document handling | PASS |
| Frontend production build | PASS |

**13/13 verification tests passed.**

The detailed implementation state and verification history are maintained in:

```text
DOCS/Memory.md
```

---

# Roadmap

```text
Milestone 1
Local AI Vertical Slice
        ↓
Milestone 2
Document Intelligence
        ↓
Milestone 3
Local RAG
        ↓
Milestone 4
Agent Runtime
        ↓
Milestone 5
Visual Agent Canvas
        ↓
Milestone 6
Human-in-the-Loop Approval
        ↓
Milestone 7
Model Routing
        ↓
Milestone 8
Sandboxed Tools
        ↓
Milestone 9
Security / Network Verification
        ↓
Final Hackathon Demonstration
```

---

# Next Milestone — Local RAG

The next implementation stage is the local knowledge layer.

Planned pipeline:

```text
Documents
    ↓
Text Extraction
    ↓
Chunking
    ↓
Local Embeddings
    ↓
Vector Database
    ↓
Similarity Search
    ↓
Retrieved Context
    ↓
Local LLM
    ↓
Grounded Response
```

Planned capabilities include:

1. Local vector database
2. Text chunking
3. Local embedding model
4. Knowledge-base ingestion
5. Semantic search
6. Retrieval API
7. Context injection
8. Grounded document analysis

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
