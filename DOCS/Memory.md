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

IN PROGRESS — MILESTONE 1 COMPLETE

## Current Phase

PHASE 0 — FOUNDATION (VERTICAL SLICE DONE)

## Current Day

DAY 1 / 7

## Overall Completion

15%

## Current Objective

Milestone 1 complete. Full data path verified:
React Frontend → FastAPI Backend → Ollama (qwen3.5:0.8b) → FastAPI → React

Next: Phase 1 — Multimodal document ingestion pipeline (PDF/OCR).

---

# 3. WHAT IS CURRENTLY WORKING

> Only list functionality that has actually been implemented and tested.

- FastAPI backend running at `http://127.0.0.1:8000` (uvicorn, Python 3.14.4)
- `GET /api/health` → `{"status":"ok","sovereign_mode":true}` ✅
- `GET /api/models/health` → Ollama connected, `qwen3.5:0.8b` available ✅
- `GET /api/models` → Returns installed local model list ✅
- `POST /api/chat` → Real completions from `qwen3.5:0.8b` via Ollama ✅
- React + Vite + TypeScript frontend at `http://localhost:5173`
- SystemStatus component polling `/api/health` and `/api/models/health` live
- PromptBox component accepting user input
- ResponseViewer showing response text + model/duration/token metadata
- `think: false` API flag disabling reasoning chains → sub-2s responses for short prompts
- CORS configured for frontend ↔ backend communication
- Zero external API calls — entirely local, air-gapped capable

---

# 4. WHAT IS CURRENTLY BROKEN

> Do not hide failures.
> Record known bugs, incomplete integrations, crashes, and blockers.

- `qwen3.5:0.8b` is a reasoning model; without `think: false` in the Ollama API payload, it generates 2000+ reasoning tokens before answering — causing the 60s default timeout to expire. Fixed by adding `"think": false` to all Ollama provider payloads and setting `OLLAMA_TIMEOUT_SECONDS=300` for longer prompts.
- On Windows, `localhost` resolves to IPv6 `::1` first, causing Ollama connection failures. Fixed by using `127.0.0.1` explicitly in `.env`.

---

# 5. WHAT HAS BEEN BUILT

## Frontend

Status: MILESTONE 1 COMPLETE

```text
[x] React 19 application
[x] TypeScript 5.7
[x] Vite 6 with /api proxy to FastAPI
[ ] React Flow
[ ] Zustand
[x] Application shell (Header, main layout)
[x] SystemStatus component (live backend + Ollama health polling)
[x] PromptBox component (with Ctrl+Enter shortcut)
[x] ResponseViewer component (response + model/duration/token metadata)
[ ] Agent Canvas
[ ] Execution Monitor
```

## Backend

Status: MILESTONE 1 COMPLETE

```text
[x] FastAPI 0.115+
[x] API structure (/api prefix, routers)
[x] Health endpoint GET /api/health
[x] Model health endpoint GET /api/models/health
[x] Model list endpoint GET /api/models
[x] Chat endpoint POST /api/chat
[x] CORS middleware for localhost:5173
[x] Pydantic settings (config.py)
[x] ModelProvider abstract base class (base.py)
[x] OllamaProvider implementation (ollama_provider.py)
[x] ModelService dispatcher (model_service.py)
[x] Error handling and structured logging
[ ] WebSocket execution stream
[ ] Workflow engine
[ ] Agent runtime
[ ] Tool registry
```

## AI / Models

Status: MILESTONE 1 COMPLETE

```text
[x] Local model server — Ollama at http://127.0.0.1:11434
[x] Model provider abstraction (ModelProvider ABC)
[x] OllamaProvider (generate + stream + health + list_models)
[x] Text model — qwen3.5:0.8b (873M Q8_0, context 262k, vision capable)
[x] think: false flag to disable reasoning chain for fast responses
[ ] Model registry (multi-model)
[ ] Vision model workflow
[ ] Coding model
```

## Multimodal

Status: NOT STARTED

```text
[ ] PDF extraction
[ ] OCR
[ ] Image processing
[ ] Vision model
[ ] Scanned document pipeline
```

## Knowledge Base

Status: NOT STARTED

```text
[ ] Document ingestion
[ ] Chunking
[ ] Embeddings
[ ] Vector database
[ ] Retrieval
[ ] Source references
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

> Update this whenever architecture changes.

Current architecture:

```text
NOT IMPLEMENTED
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

## Phase 3 — Multimodal

Status:

NOT STARTED

### Tasks

```text
[ ] PDF processing
[ ] OCR
[ ] Image processing
[ ] Vision model
[ ] Structured findings
```

---

## Phase 4 — RAG + Approval + Artifacts

Status:

NOT STARTED

### Tasks

```text
[ ] Knowledge ingestion
[ ] Embeddings
[ ] Vector search
[ ] Evidence
[ ] Human approval
[ ] DOCX generation
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

> Append meaningful changes here.

### YYYY-MM-DD — <AI Agent>

Implemented:

```text
- ...
- ...
- ...
```

Modified:

```text
- ...
- ...
```

Created:

```text
- ...
- ...
```

Removed:

```text
- ...
```

---

# 11. FILES CREATED

Maintain an accurate list of important project files.

```text
frontend/
backend/
docker-compose.yml
README.md
MEMORY.md
```

As the project grows, update this section.

Example:

```text
frontend/src/components/AgentCanvas.tsx
frontend/src/components/AgentNode.tsx
backend/app/workflow/engine.py
backend/app/agents/pdf_auditor.py
```

---

# 12. IMPORTANT FILES

> Tell future AI agents where important functionality lives.

| Component       | File | Status          |
| --------------- | ---- | --------------- |
| Frontend entry  | TBD  | Not implemented |
| Canvas          | TBD  | Not implemented |
| Workflow engine | TBD  | Not implemented |
| Agent runtime   | TBD  | Not implemented |
| Model router    | TBD  | Not implemented |
| RAG             | TBD  | Not implemented |
| OCR             | TBD  | Not implemented |
| Sandbox         | TBD  | Not implemented |
| DOCX generator  | TBD  | Not implemented |

---

# 13. API STATUS

## Implemented APIs

```text
None
```

## Planned APIs

```text
GET  /api/health
GET  /api/models
GET  /api/workflows
POST /api/workflows
POST /api/executions
GET  /api/executions/{id}
POST /api/approvals/{id}
GET  /api/artifacts
```

---

# 14. ENVIRONMENT STATUS

## Required Services

```text
[ ] Frontend
[ ] Backend
[ ] Local model server
[ ] Vector database
[ ] Docker
```

## Current Services

```text
None
```

## Ports

> Update when ports are actually chosen.

```text
Frontend:
Backend:
Model Server:
Vector DB:
```

---

# 15. MODELS

## Installed Models

```text
None
```

## Model Capabilities

| Model | Type | Vision | Coding | Reasoning | Status |
| ----- | ---- | -----: | -----: | --------: | ------ |
| TBD   | TBD  |    TBD |    TBD |       TBD | TBD    |

---

# 16. KNOWLEDGE BASE

## Current Documents

```text
None
```

## Indexed Documents

```text
None
```

## Vector Database

Status:

NOT CONFIGURED

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
1. Initialize frontend
2. Initialize backend
3. Connect frontend to backend
4. Start local model server
5. Verify local inference
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
Not implemented
```

## Manual Tests

```text
Not implemented
```

## Latest Successful Test

```text
None
```

---

# 28. DEMO STATUS

## Hero Workflow

NOT READY

## Coding Workflow

NOT READY

## Offline Demonstration

NOT READY

## Network/Sovereignty Proof

NOT READY

## Artifact Generation

NOT READY

---

# 29. DEMO DATA

## Inspection Report

```text
TBD
```

## Knowledge Documents

```text
TBD
```

## Coding Task

```text
TBD
```

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

None

## Last Session

None

## Last Completed Task

None

## Current Task

Initialize project.

## Next Task

Create the initial frontend/backend project structure.

---

# 36. CHANGE HISTORY

> Keep a concise chronological record.

| Date    | Agent | Phase   | Change            | Status |
| ------- | ----- | ------- | ----------------- | ------ |
| Initial | —     | Phase 0 | MEMORY.md created | Active |

---

# 37. CURRENT PROJECT SNAPSHOT

This section should always remain concise.

```text
PROJECT:
Sovereign AI Workbench

PHASE:
Phase 0 — Foundation

STATUS:
Not Started

WORKING:
Nothing yet

BROKEN:
Nothing known

CURRENT TASK:
Initialize project

NEXT:
Frontend + Backend foundation

HERO WORKFLOW:
Not implemented

CODING WORKFLOW:
Not implemented

OFFLINE MODE:
Not tested

EXTERNAL AI CALLS:
0 known

LAST UPDATED:
YYYY-MM-DD
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
