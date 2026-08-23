# Sovereign AI Workbench

> **Sovereign On-Premise Agentic AI Workbench using Open-Weight Multimodal LLMs**

A self-hosted AI workbench designed for sensitive industrial, government, defence, and enterprise environments where confidential data cannot be sent to external cloud AI APIs.

The current implementation provides a fully local AI vertical slice:

```text
React Frontend
      ↓
FastAPI Backend
      ↓
Ollama
      ↓
Qwen3.5 0.8B
      ↓
FastAPI Backend
      ↓
React Frontend
````

All AI inference currently runs locally through Ollama.

---

# 1. Current Status

## Milestone 1 — Local AI Vertical Slice

**Status: Complete**

The current implementation provides:

* React + TypeScript frontend
* FastAPI backend
* Ollama integration
* `qwen3.5:0.8b` local model
* Model provider abstraction
* Backend health monitoring
* Ollama/model health monitoring
* Local AI chat generation
* Industrial/sovereign UI
* Environment-based configuration
* No cloud AI APIs

---

# 2. Requirements

You need the following installed:

* Git
* Python 3.10+
* pip
* Node.js
* npm
* Ollama

Check your installations:

```bash
git --version
python --version
pip --version
node --version
npm --version
ollama --version
```

---

# 3. Clone the Repository

Open **Command Prompt, PowerShell, or Git Bash**.

```bash
git clone https://github.com/FASTGAMER1247/Sovereign-AI-Workbench.git
```

Enter the project:

```bash
cd Sovereign-AI-Workbench
```

The project structure should look like:

```text
Sovereign-AI-Workbench/
│
├── DOCS/
├── backend/
├── frontend/
├── .gitignore
└── README.md
```

---

# 4. Install Ollama

Download Ollama from:

[https://ollama.com/download](https://ollama.com/download)

Install it normally.

Verify:

```bash
ollama --version
```

---

# 5. Download the AI Model

The current development model is:

```text
qwen3.5:0.8b
```

Download it:

```bash
ollama pull qwen3.5:0.8b
```

Verify:

```bash
ollama list
```

You should see:

```text
qwen3.5:0.8b
```

---

# 6. Verify Ollama

Before starting the project, make sure Ollama is working.

Run:

```bash
curl http://127.0.0.1:11434/api/tags
```

You should receive JSON containing:

```text
qwen3.5:0.8b
```

You can also test generation directly:

```bash
curl http://127.0.0.1:11434/api/chat -d "{\"model\":\"qwen3.5:0.8b\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in one sentence.\"}],\"stream\":false,\"think\":false}"
```

A JSON response containing an AI-generated message should be returned.

---

# 7. Backend Setup

Open a terminal at the project root:

```bash
cd Sovereign-AI-Workbench
```

Enter the backend:

```bash
cd backend
```

## Windows

Create a Python virtual environment:

```cmd
python -m venv .venv
```

Activate it in **Command Prompt**:

```cmd
.venv\Scripts\activate
```

Your terminal should now look similar to:

```text
(.venv) C:\...\Sovereign-AI-Workbench\backend>
```

### If using PowerShell

Use:

```powershell
.venv\Scripts\Activate.ps1
```

### If using Git Bash

Use:

```bash
source .venv/Scripts/activate
```

> **Important:** `source` does not work in Windows Command Prompt.

---

# 8. Install Backend Dependencies

With the virtual environment activated:

```bash
pip install -r requirements.txt
```

This installs the project's backend dependencies.

---

# 9. Create the Backend Environment File

The repository contains:

```text
backend/.env.example
```

Create your local `.env` from it.

### Command Prompt

```cmd
copy .env.example .env
```

### Git Bash

```bash
cp .env.example .env
```

The resulting file should be:

```text
backend/
├── .env
├── .env.example
├── requirements.txt
└── app/
```

---

# 10. Backend Environment Configuration

The `.env` should contain local configuration similar to:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
DEFAULT_MODEL=qwen3.5:0.8b
HOST=127.0.0.1
PORT=8000
OLLAMA_TIMEOUT_SECONDS=300
```

### Important

Do **not** commit `.env` to GitHub.

It is intentionally excluded through `.gitignore`.

`.env.example` is safe to commit because it contains configuration examples rather than machine-specific secrets.

---

# 11. Start the Backend

Make sure you are inside:

```text
Sovereign-AI-Workbench/backend
```

and your virtual environment is activated.

Run:

```bash
python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

You should see:

```text
Uvicorn running on http://127.0.0.1:8000
```

### Keep this terminal open.

The backend must remain running while using the application.

---

# 12. Verify the Backend

Open a **new terminal**.

Run:

```bash
curl http://127.0.0.1:8000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "app": "Sovereign AI Workbench Backend",
  "version": "0.1.0",
  "sovereign_mode": true
}
```

---

# 13. Check Ollama Through the Backend

Run:

```bash
curl http://127.0.0.1:8000/api/models/health
```

The response should indicate:

* Ollama is connected
* The configured model is available
* The provider is `ollama`
* The model is `qwen3.5:0.8b`

---

# 14. Test AI Generation

Run:

```bash
curl -X POST http://127.0.0.1:8000/api/chat -H "Content-Type: application/json" -d "{\"prompt\":\"Explain sovereign AI in two sentences.\"}"
```

You should receive an actual response generated by the local Ollama model.

The request path is:

```text
Client
  ↓
FastAPI
  ↓
Model Service
  ↓
Ollama Provider
  ↓
Ollama
  ↓
Qwen3.5
```

---

# 15. Frontend Setup

Open another terminal.

From the project root:

```bash
cd Sovereign-AI-Workbench/frontend
```

Install frontend dependencies:

```bash
npm install
```

This creates:

```text
frontend/node_modules/
```

`node_modules` is intentionally excluded from Git.

---

# 16. Start the Frontend

Run:

```bash
npm run dev
```

Vite should display something similar to:

```text
Local: http://localhost:5173/
```

Open:

[http://localhost:5173/](http://localhost:5173/)

in your browser.

---

# 17. Running the Complete Application

You should have the following running:

## Terminal 1 — Backend

```bash
cd Sovereign-AI-Workbench/backend
```

Activate the virtual environment.

Windows CMD:

```cmd
.venv\Scripts\activate
```

Then:

```bash
python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

---

## Terminal 2 — Frontend

```bash
cd Sovereign-AI-Workbench/frontend
npm run dev
```

---

## Ollama

Ollama must be running locally with:

```text
qwen3.5:0.8b
```

---

## Browser

Open:

```text
http://localhost:5173
```

---

# 18. System Architecture

```text
                         LOCAL MACHINE
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                  React + TypeScript                      │
│                  Vite Development Server                │
│                                                          │
│                  localhost:5173                          │
│                         │                                │
│                         │ /api                           │
│                         ▼                                │
│                  FastAPI Backend                         │
│                  127.0.0.1:8000                         │
│                         │                                │
│                         ▼                                │
│                  Model Service                           │
│                         │                                │
│                         ▼                                │
│                  Ollama Provider                         │
│                         │                                │
│                         ▼                                │
│                  Ollama API                              │
│                  127.0.0.1:11434                         │
│                         │                                │
│                         ▼                                │
│                  Qwen3.5 0.8B                            │
│                                                          │
└──────────────────────────────────────────────────────────┘

                 NO CLOUD AI API REQUIRED
```

---

# 19. Important Sovereignty Principle

The application is designed so that:

```text
React
  ↓
FastAPI
  ↓
Local Model Provider
  ↓
Ollama
  ↓
Local Model
```

The frontend does **not** communicate directly with Ollama.

The frontend communicates only with the FastAPI backend.

The FastAPI backend communicates with the local model provider.

This keeps model infrastructure isolated from the UI and allows additional local model providers to be introduced later.

---

# 20. Project Structure

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
│   │   │   ├── __init__.py
│   │   │   └── routes.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── ollama_provider.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── model_service.py
│   │   │
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── main.py
│   │
│   ├── .env.example
│   ├── requirements.txt
│   └── .venv/              # Local only
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts
│   │   │
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── PromptBox.tsx
│   │   │   ├── ResponseViewer.tsx
│   │   │   └── SystemStatus.tsx
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/        # Local only
│
├── .gitignore
└── README.md
```

---

# 21. Files That Must NOT Be Committed

Do not commit machine-specific/generated files:

```text
backend/.venv/
backend/.env
**/__pycache__/
frontend/node_modules/
```

These are already covered by `.gitignore`.

---

# 22. Files That MUST Be Committed

Commit:

```text
DOCS/
backend/app/
backend/requirements.txt
backend/.env.example
frontend/src/
frontend/package.json
frontend/package-lock.json
frontend/tsconfig.json
frontend/vite.config.ts
.gitignore
README.md
```

---

# 23. Troubleshooting

## Ollama connection failed

Check:

```bash
curl http://127.0.0.1:11434/api/tags
```

If this fails, make sure Ollama is installed and running.

Then:

```bash
ollama list
```

Make sure:

```text
qwen3.5:0.8b
```

is installed.

---

## Backend cannot connect to Ollama

Check your `.env`:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Use:

```text
127.0.0.1
```

rather than:

```text
localhost
```

on Windows if connection problems occur.

---

## `.venv\Scripts\activate` doesn't work

Make sure you are inside:

```text
backend/
```

and that the virtual environment exists.

Create it:

```cmd
python -m venv .venv
```

Then:

```cmd
.venv\Scripts\activate
```

---

## `source` is not recognized

If you are using Windows Command Prompt, don't use:

```bash
source .venv/Scripts/activate
```

Use:

```cmd
.venv\Scripts\activate
```

`source` is for Git Bash/Linux-style shells.

---

## `pip install` fails

Make sure the virtual environment is activated:

```text
(.venv)
```

Then:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## Frontend dependencies are missing

Run:

```bash
cd frontend
npm install
```

Then:

```bash
npm run dev
```

---

## Port 8000 is already in use

Check which process is using it:

```cmd
netstat -ano | findstr :8000
```

You can terminate the process if necessary, or change the backend port.

If changing the port, make sure the frontend proxy configuration is updated accordingly.

---

# 24. Development Workflow

Before starting development:

```bash
git pull
```

After making changes:

```bash
git status
```

Review the changes:

```bash
git diff
```

Stage:

```bash
git add .
```

Commit:

```bash
git commit -m "Describe your changes"
```

Push:

```bash
git push
```

---

# 25. Important Development Rules

Before modifying the project, read:

```text
DOCS/PRD.md
DOCS/Architecture.md
DOCS/Rules.md
DOCS/Phases.md
DOCS/Design.md
DOCS/Memory.md
```

These documents define the project's requirements, architecture, implementation phases, design system, engineering rules, and current development state.

Do not introduce cloud AI APIs without explicitly changing the project architecture and requirements.

Do not replace real AI inference with mock responses for demonstrations.

Do not bypass the model provider abstraction.

Keep AI inference local.

---

# 26. Current Development Model

The current development model is:

```text
qwen3.5:0.8b
```

It is being used as the initial local development model because it can run on relatively modest hardware.

The architecture is intentionally model-provider agnostic so that larger or specialized local models can be introduced later.

---

# 27. Current API Endpoints

| Endpoint             | Method | Purpose             |
| -------------------- | ------ | ------------------- |
| `/api/health`        | GET    | Backend health      |
| `/api/models/health` | GET    | Ollama/model health |
| `/api/models`        | GET    | Available models    |
| `/api/chat`          | POST   | Local AI generation |

---

# 28. Current Milestone

### Milestone 1 — Local AI Vertical Slice

```text
React
   ↓
FastAPI
   ↓
Model Provider
   ↓
Ollama
   ↓
Qwen3.5
```

**Status: COMPLETE**

---

# 29. Upcoming Development

The next major components planned for the workbench include:

1. Document ingestion
2. PDF processing
3. OCR
4. Local vision processing
5. Local knowledge base
6. Vector search / RAG
7. Agent framework
8. Tool execution
9. PDF Auditor agent
10. Human approval gates
11. Agent Canvas
12. Multimodal workflows
13. Document generation
14. Code execution sandbox
15. Model auto-selection
16. Sovereignty/network monitoring

These should be implemented according to the project's phase documents.

---

# 30. Quick Start

For experienced developers:

### Terminal 1 — Backend

```bash
cd Sovereign-AI-Workbench/backend
```

Windows CMD:

```cmd
python -m venv .venv
.venv\Scripts\activate
```

Then:

```bash
pip install -r requirements.txt
```

Create `.env` from `.env.example`.

Then:

```bash
python -u -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 2 — Frontend

```bash
cd Sovereign-AI-Workbench/frontend
npm install
npm run dev
```

### Ollama

```bash
ollama pull qwen3.5:0.8b
```

### Browser

```text
http://localhost:5173
```

---

# 31. Sovereign AI Workbench

Built for:

* Air-gapped environments
* Industrial organizations
* Government environments
* Defence-linked organizations
* Sensitive enterprise workloads
* Local/private AI deployments

**The core principle:**

> Your data stays on your machine.
> Your models run on your machine.
> Your AI inference stays on your machine.
>
> ```
> ```
