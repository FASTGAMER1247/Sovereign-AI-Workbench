# Sovereign AI Workbench — System Architecture

**Version:** 1.0 — 7-Day Hackathon MVP  
**Architecture Type:** Local-first, modular, agentic, event-driven  
**Deployment:** Single workstation/server  
**Primary Constraint:** All AI inference, document processing, retrieval, tool execution, and artifacts remain on-premise

---

# 1. Architecture Goals

The architecture must achieve five things:

1. **Sovereignty** — no dependency on external AI APIs during execution.
2. **Agentic execution** — agents can plan/use tools/iterate instead of returning only one response.
3. **Multimodality** — PDFs, scanned documents and images are supported.
4. **Human control** — sensitive actions can pause for explicit approval.
5. **Extensibility** — models, agents, tools and workflows can be added without redesigning the core system.

For the 7-day build, architectural simplicity is more important than enterprise-scale distribution.

---

# 2. Architecture Principles

## 2.1 Local by Default

Every AI and data operation should use local services.

```text
User Data
   ↓
Local Application
   ↓
Local AI / Tools / Storage
   ↓
Local Artifact
```

There should be no runtime requirement for:

- OpenAI API
- Anthropic API
- Google AI API
- Cloud OCR
- Cloud vector database
- Cloud storage
- Cloud code execution

---

## 2.2 Model Agnostic

Agents must not depend directly on a specific model.

```text
Agent
  ↓
Model Router
  ↓
Model Provider
  ↓
Local Model Server
```

This allows the team to replace or add models without rewriting agents.

---

## 2.3 Tools Through a Registry

Agents must access capabilities through registered tools.

```text
Agent
  ↓
Tool Registry
  ↓
Policy Check
  ↓
Tool
```

Agents should never receive unrestricted host access.

---

## 2.4 Workflow Engine Owns Execution

The frontend describes workflows.

The backend executes them.

```text
React Flow
    ↓
Workflow JSON
    ↓
Execution Engine
    ↓
Agents / Tools / Models
```

The frontend must not contain execution logic.

---

## 2.5 Human Approval Is a First-Class Node

Approval is part of the workflow graph.

```text
Agent
  ↓
Approval Node
  ↓
Human Decision
  ↓
Continue / Reject
```

---

# 3. High-Level Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                         USER                                  │
│                                                               │
│  Upload files • Build workflow • Review • Approve • Download │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                       FRONTEND                                │
│                                                               │
│ React + TypeScript + Vite                                    │
│ React Flow • Tailwind • Zustand • Monaco                     │
│                                                               │
│ Dashboard                                                     │
│ Agent Canvas                                                  │
│ Execution Monitor                                             │
│ Approval UI                                                   │
│ Artifact Viewer                                               │
│ Sovereignty Dashboard                                         │
└───────────────────────────────┬───────────────────────────────┘
                                │
                         REST / WebSocket
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│                        FASTAPI                                │
│                                                               │
│ API Layer                                                     │
│ Workflow Manager                                              │
│ Execution Engine                                              │
│ Agent Runtime                                                 │
│ Model Router                                                  │
│ Tool Registry                                                 │
│ Policy Engine                                                 │
│ Approval Manager                                              │
│ Audit Logger                                                  │
│ Artifact Manager                                              │
└──────────────┬──────────────┬──────────────┬───────────────────┘
               │              │              │
               ▼              ▼              ▼
        ┌────────────┐  ┌────────────┐  ┌──────────────┐
        │   MODEL    │  │ KNOWLEDGE  │  │    TOOLS     │
        │   LAYER    │  │   LAYER    │  │    LAYER     │
        │            │  │            │  │              │
        │   Ollama   │  │   Qdrant   │  │ OCR          │
        │ Open-weight│  │ Embeddings │  │ PDF          │
        │ Models     │  │ Documents  │  │ Docker       │
        │ VLM        │  │            │  │ DOCX         │
        └────────────┘  └────────────┘  └──────────────┘
               │              │              │
               └──────────────┼──────────────┘
                              ▼
                    ┌──────────────────┐
                    │ LOCAL STORAGE    │
                    │                  │
                    │ Files            │
                    │ Artifacts        │
                    │ Audit logs       │
                    │ Workflow data    │
                    └──────────────────┘
```

---

# 4. Component Architecture

## 4.1 Frontend

### Technology

- React
- TypeScript
- Vite
- React Flow
- Tailwind CSS
- Zustand
- Monaco Editor

### Responsibilities

The frontend is responsible for:

- Rendering workflows
- Editing nodes
- Configuring agents
- Uploading files
- Starting executions
- Displaying streaming events
- Showing approval requests
- Showing generated artifacts
- Showing system sovereignty status

### Frontend must NOT

- Execute AI models
- Execute generated code
- Perform unrestricted filesystem operations
- Implement workflow execution semantics

---

# 5. Backend Architecture

FastAPI is the central application layer.

```text
backend/
├── api/
├── workflows/
├── agents/
├── models/
├── tools/
├── policies/
├── approvals/
├── knowledge/
├── artifacts/
├── audit/
└── core/
```

---

# 6. API Layer

The API layer exposes application operations to the frontend.

## Responsibilities

- Authentication boundary if added later
- Input validation
- Workflow CRUD
- Execution control
- Approval actions
- Artifact access
- Knowledge ingestion/search
- System health

Example:

```text
POST /api/workflows/{id}/execute
```

starts an execution.

---

# 7. Workflow Engine

The workflow engine is the heart of the system.

It receives a graph:

```text
Node A → Node B → Node C
```

and determines:

- Which node runs next
- What input it receives
- What output it produces
- Whether a tool can be called
- Whether approval is required
- What happens on failure

---

# 8. Workflow State Machine

```text
              ┌───────────┐
              │  QUEUED   │
              └─────┬─────┘
                    │
                    ▼
              ┌───────────┐
              │  RUNNING  │
              └─────┬─────┘
                    │
          ┌─────────┼─────────┐
          │         │         │
          ▼         ▼         ▼
     COMPLETED   WAITING    FAILED
                 APPROVAL
                    │
              ┌─────┴─────┐
              │           │
              ▼           ▼
          APPROVED      REJECTED
              │
              ▼
           RUNNING
```

---

# 9. Workflow Definition

Workflows should be represented as JSON.

Example:

```json
{
  "name": "Inspection Approval",
  "nodes": [
    {
      "id": "pdf",
      "type": "pdf_auditor",
      "config": {}
    },
    {
      "id": "rag",
      "type": "knowledge_search",
      "config": {}
    },
    {
      "id": "risk",
      "type": "risk_analyzer",
      "config": {}
    },
    {
      "id": "approval",
      "type": "human_approval",
      "config": {}
    },
    {
      "id": "docx",
      "type": "docx_generator",
      "config": {}
    }
  ],
  "edges": [
    {"source": "pdf", "target": "rag"},
    {"source": "rag", "target": "risk"},
    {"source": "risk", "target": "approval"},
    {"source": "approval", "target": "docx"}
  ]
}
```

This same representation should be usable by the UI and execution engine.

---

# 10. Agent Runtime

The agent runtime executes an agent within the workflow.

Conceptual flow:

```text
Agent Input
    ↓
Agent Instructions
    ↓
Model Router
    ↓
Local Model
    ↓
Reasoning / Tool Decision
    ↓
Tool Registry
    ↓
Tool Result
    ↓
Model
    ↓
Agent Output
```

The runtime should support limited iterative execution.

For the MVP, avoid building a complex autonomous planner.

A controlled loop is enough:

```text
Think → Tool → Observe → Think → Finish
```

with a configurable maximum number of iterations.

---

# 11. Agent Interface

Every agent should expose a consistent interface.

Conceptually:

```python
class Agent:
    name: str
    description: str
    capabilities: list[str]
    tools: list[str]

    async def run(context):
        ...
```

The exact implementation can differ, but the contract should remain consistent.

---

# 12. Model Layer

The model layer isolates application logic from model-serving technology.

```text
┌───────────────────────┐
│     Model Router      │
└───────────┬───────────┘
            │
     Model Provider
            │
    ┌───────┴────────┐
    ▼                ▼
 Ollama            Future
 Provider          Provider
    │
    ├── Reasoning Model
    ├── Coding Model
    └── Vision Model
```

---

# 13. Model Provider Interface

Conceptual interface:

```python
class ModelProvider:

    async def generate(self, request):
        ...

    async def stream(self, request):
        ...

    def capabilities(self):
        ...

    async def health(self):
        ...
```

This allows future support for:

- Ollama
- vLLM
- llama.cpp
- Another local provider

without rewriting the agent runtime.

---

# 14. Model Registry

Maintain metadata for available models.

Example:

```json
{
  "name": "local-coder",
  "provider": "ollama",
  "capabilities": [
    "coding",
    "reasoning"
  ],
  "context_length": 32768,
  "vision": false
}
```

The registry should allow the router to determine which models are eligible.

---

# 15. Model Router

The MVP router should use deterministic capability matching.

```text
Task
 ↓
Classify
 ↓
Capabilities required
 ↓
Filter available models
 ↓
Select suitable model
 ↓
Execute
```

Example:

```text
"Analyze scanned inspection image"
            ↓
VISION + REASONING
            ↓
Local VLM
```

```text
"Write and test Python code"
            ↓
CODING + REASONING
            ↓
Local coding model
```

Every model selection should generate an audit event.

---

# 16. Multimodal Pipeline

## Input Types

- PDF
- PNG
- JPG
- Scanned documents

## Processing

```text
                INPUT
                  │
                  ▼
          Document Detector
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
      Text      Scanned     Image
       PDF        PDF
        │          │          │
        ▼          ▼          ▼
   Text Extract   OCR        VLM
        │          │          │
        └──────────┼──────────┘
                   ▼
          Normalized Evidence
                   │
                   ▼
                Agent
```

---

# 17. PDF Processing

Use PyMuPDF or equivalent local processing.

Responsibilities:

- Extract text
- Identify page count
- Render pages when required
- Extract metadata
- Detect pages requiring OCR

No document should leave the local environment.

---

# 18. OCR

Use a local OCR engine such as PaddleOCR.

```text
Scanned Page
    ↓
Image
    ↓
Local OCR
    ↓
Text + Bounding Information
    ↓
Normalized Document
```

OCR output should preserve page references.

---

# 19. Vision Model

A local VLM handles visual content that OCR cannot adequately interpret.

Examples:

- Engineering diagrams
- Tables
- Photographs
- Handwritten notes
- Inspection images

The VLM should receive only locally stored content.

---

# 20. Knowledge / RAG Architecture

```text
                    LOCAL DOCUMENTS
                           │
                           ▼
                     Parser / OCR
                           │
                           ▼
                        Chunker
                           │
                           ▼
                  Local Embedding Model
                           │
                           ▼
                        Qdrant
                           │
                           ▼
                       Retriever
                           │
                           ▼
                  Relevant Evidence
                           │
                           ▼
                         Agent
```

---

# 21. Knowledge Sources

The demo knowledge base should contain synthetic/sanitized documents such as:

```text
knowledge/
├── safety_manual.pdf
├── inspection_sop.pdf
├── maintenance_guidelines.pdf
└── previous_approval_notes.pdf
```

Each result should include:

- Source document
- Page
- Text
- Relevance information

---

# 22. Tool Architecture

Tools are registered capabilities.

```text
                 AGENT
                   │
                   ▼
              TOOL REQUEST
                   │
                   ▼
              TOOL REGISTRY
                   │
                   ▼
              POLICY ENGINE
                   │
             ┌─────┴─────┐
             │           │
          ALLOW       APPROVAL
             │           │
             ▼           ▼
           TOOL       HUMAN
             │
             ▼
           RESULT
             │
             ▼
           AGENT
```

---

# 23. Required Tools

| Tool | Purpose | Execution |
|---|---|---|
| `read_file` | Read approved local files | Backend |
| `write_file` | Write artifacts/workspace | Backend |
| `extract_pdf` | Parse PDFs | Local process |
| `ocr` | OCR scanned content | Local process |
| `vision_analyze` | Analyze images | Local VLM |
| `knowledge_search` | Search private knowledge | Qdrant |
| `execute_python` | Run generated Python | Docker |
| `run_tests` | Verify generated code | Docker |
| `generate_docx` | Create approval note | Local process |

---

# 24. Code Sandbox Architecture

Generated code must never execute directly on the host.

```text
             CODING AGENT
                  │
                  ▼
             Generated Code
                  │
                  ▼
             Policy Check
                  │
                  ▼
        ┌────────────────────┐
        │    DOCKER          │
        │    SANDBOX         │
        │                    │
        │ Network: DISABLED  │
        │ CPU: LIMITED       │
        │ RAM: LIMITED       │
        │ Time: LIMITED      │
        │ FS: RESTRICTED     │
        └─────────┬──────────┘
                  │
                  ▼
             Test Results
                  │
                  ▼
              Verifier
                  │
                  ▼
            Coding Agent
```

---

# 25. Sandbox Requirements

Mandatory:

- Network disabled
- Resource limits
- Execution timeout
- Restricted mounted directories
- No host secrets
- No Docker socket inside sandbox
- No unrestricted subprocess access to host

The sandbox should be disposable where practical.

---

# 26. Human Approval Architecture

Approval is implemented as a workflow state.

```text
Risk Analyzer
     │
     ▼
Approval Required
     │
     ▼
Backend stores pending decision
     │
     ▼
WebSocket → Frontend
     │
     ▼
Human reviews evidence
     │
     ├──────────────┐
     ▼              ▼
 APPROVE          REJECT
     │              │
     ▼              ▼
Continue         Terminate
```

Approval records should include:

- Execution ID
- Node ID
- Proposed action
- Evidence
- Decision
- Timestamp

---

# 27. Artifact Architecture

Artifacts are generated locally.

```text
Agent Result
    ↓
Structured Data
    ↓
Artifact Manager
    ↓
python-docx
    ↓
Local Artifact
    ↓
Frontend
```

Minimum artifact:

```text
approval_note.docx
```

Artifact metadata:

```text
artifact_id
execution_id
filename
type
created_at
source_workflow
```

---

# 28. Real-Time Event Architecture

Use WebSockets.

```text
Workflow Engine
      │
      ▼
 Event Bus / Event Manager
      │
      ▼
 WebSocket
      │
      ▼
 React Execution Monitor
```

Events:

```text
execution_started
node_started
token
tool_started
tool_completed
approval_required
approval_received
node_completed
artifact_created
execution_completed
execution_failed
```

---

# 29. Audit Architecture

Every important operation generates an audit event.

Example:

```json
{
  "timestamp": "2026-08-23T12:00:00",
  "execution_id": "exec_123",
  "agent": "risk_analyzer",
  "model": "local-reasoning-model",
  "tool": "knowledge_search",
  "action": "search",
  "status": "success"
}
```

Audit events should be visible in the execution interface.

---

# 30. Sovereignty Architecture

The sovereignty claim must be technically demonstrable.

## Runtime Network Policy

```text
                    INTERNET
                       X
                       │
                 BLOCKED / UNUSED
                       │
                       ▼
             ┌──────────────────┐
             │ LOCAL WORKSTATION│
             │                  │
             │ Frontend         │
             │ Backend          │
             │ Ollama           │
             │ Qdrant           │
             │ Docker           │
             │ Local Files      │
             └──────────────────┘
```

The application should not require internet access after setup/model preparation.

---

# 31. Sovereignty Dashboard

Display:

```text
External AI Calls       0
Cloud Model Calls       0
Local Model Calls       N
Local Tool Calls        N
Network Violations      0
```

Also show:

- Active local models
- Local services
- Current execution
- Recent network/audit events

The UI must distinguish between **application telemetry** and actual network enforcement. A dashboard counter alone is not sufficient proof.

---

# 32. Data Flow — Hero Workflow

```text
                inspection_report.pdf
                         │
                         ▼
                  File Upload
                         │
                         ▼
                    PDF Auditor
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        Text Extraction            OCR
              │                     │
              └──────────┬──────────┘
                         ▼
                    Vision Model
                         │
                         ▼
                 Structured Findings
                         │
                         ▼
                 Knowledge Search
                         │
                         ▼
                   Qdrant Results
                         │
                         ▼
                   Risk Analyzer
                         │
                         ▼
                 Human Approval
                         │
                  ┌──────┴──────┐
                  ▼             ▼
               Reject         Approve
                                │
                                ▼
                       DOCX Generator
                                │
                                ▼
                       approval_note.docx
```

---

# 33. Data Flow — Coding Workflow

```text
User Request
     │
     ▼
Coding Agent
     │
     ▼
Model Router
     │
     ▼
Local Coding Model
     │
     ▼
Generated Code
     │
     ▼
Policy Engine
     │
     ▼
Docker Sandbox
     │
     ▼
Tests / Execution
     │
     ▼
Verification
     │
     ▼
Final Result
```

If verification fails, the agent may perform a limited repair loop:

```text
Generate
   ↓
Test
   ↓
Fail
   ↓
Analyze
   ↓
Repair
   ↓
Test
```

Maximum retries should be bounded.

---

# 34. Persistence

For the MVP, persistence can be simple.

## PostgreSQL / SQLite

Store:

- Workflows
- Executions
- Approval decisions
- Audit events
- Artifact metadata
- Model registry

## Filesystem

Store:

```text
data/
├── uploads/
├── knowledge/
├── artifacts/
├── workspace/
└── logs/
```

---

# 35. Deployment Architecture

Use Docker Compose for repeatable local deployment.

Conceptually:

```text
docker-compose
│
├── frontend
├── backend
├── qdrant
├── postgres
└── ollama
```

The Docker sandbox can be created dynamically by the backend rather than being a permanently running service.

---

# 36. Repository Architecture

Recommended structure:

```text
sovereign-ai-workbench/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── canvas/
│   │   ├── execution/
│   │   ├── approval/
│   │   ├── artifacts/
│   │   └── sovereignty/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── workflows/
│   │   ├── models/
│   │   ├── tools/
│   │   ├── policies/
│   │   ├── approvals/
│   │   ├── knowledge/
│   │   ├── artifacts/
│   │   └── audit/
│   └── requirements.txt
│
├── data/
│   ├── uploads/
│   ├── knowledge/
│   ├── artifacts/
│   └── workspace/
│
├── deployment/
│   ├── docker-compose.yml
│   └── sandbox/
│
├── workflows/
│   └── inspection-approval.json
│
├── tests/
│
├── docs/
│
└── README.md
```

---

# 37. API Boundary

The frontend communicates only with the backend.

```text
Frontend
   │
   ├── REST → FastAPI
   │
   └── WebSocket → FastAPI
```

The frontend should not directly communicate with:

- Ollama
- Qdrant
- Docker
- Filesystem
- Database

This keeps the architecture clean and makes security enforcement centralized.

---

# 38. Internal Dependency Direction

Preferred dependency direction:

```text
UI
 ↓
API
 ↓
Workflow Engine
 ↓
Agent Runtime
 ↓
Tools / Models / Knowledge
 ↓
Infrastructure
```

Avoid:

```text
UI → Ollama
UI → Qdrant
Agent → Docker directly
Agent → Filesystem directly
```

---

# 39. Failure Handling

Every node must be capable of returning:

```text
SUCCESS
FAILED
WAITING
```

Failures should include:

- Error message
- Node ID
- Timestamp
- Execution ID

Example:

```text
Risk Analyzer
     ↓
FAILED
     ↓
Reason:
Local model unavailable
```

The workflow should stop safely rather than silently continuing with corrupted data.

---

# 40. Observability

The MVP should expose:

- Execution ID
- Current node
- Model used
- Tool used
- Execution time
- Status
- Error
- Artifact generated

A simple execution timeline is sufficient.

Do not spend the 7-day build creating a full enterprise observability platform.

---

# 41. Security Boundaries

```text
┌───────────────────────────────────────┐
│              TRUSTED APP              │
│                                       │
│ Workflow Engine                       │
│ Policy Engine                         │
│ Model Router                          │
│ Tool Registry                         │
└───────────────────┬───────────────────┘
                    │
             Controlled Tools
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
      OCR          RAG        Docker
                                │
                                ▼
                         UNTRUSTED CODE
```

Generated code should always be treated as untrusted.

---

# 42. Security Policies

Minimum policy rules:

```text
RULE 1:
No external AI provider.

RULE 2:
Generated code → Docker only.

RULE 3:
Docker sandbox → no network.

RULE 4:
Agents → registered tools only.

RULE 5:
Sensitive actions → approval when configured.

RULE 6:
Every tool/model/approval action → audit event.
```

---

# 43. 7-Day Architecture Build Order

## Day 1

Build:

```text
Frontend
FastAPI
Ollama
Docker Compose
Health checks
```

Architecture milestone:

> Frontend → Backend → Local Model

---

## Day 2

Build:

```text
React Flow
Workflow schema
Workflow executor
Agent interface
WebSocket events
```

Architecture milestone:

> Canvas → Workflow Engine → Agent → Model

---

## Day 3

Build:

```text
PDF processor
OCR
VLM
Multimodal agent
```

Architecture milestone:

> Document → Local perception → Structured result

---

## Day 4

Build:

```text
Qdrant
Embeddings
Retriever
Model registry
Router
```

Architecture milestone:

> Agent → Local Knowledge → Appropriate Local Model

---

## Day 5

Build:

```text
Approval state
Approval UI
Audit
DOCX generator
```

Architecture milestone:

> End-to-end hero workflow

---

## Day 6

Build:

```text
Coding agent
Docker sandbox
Verification
Network isolation
Sovereignty UI
```

Architecture milestone:

> Agentic coding + sovereignty proof

---

## Day 7

Focus only on:

```text
Integration
Reliability
Offline test
Bug fixing
Demo
```

Do not redesign the architecture on Day 7.

---

# 44. Architecture Tradeoffs

## Custom Agent Runtime vs Framework

### Decision
Use a **small custom runtime** for the MVP.

### Reason

A large agent framework may introduce:

- Unnecessary abstractions
- Dependency complexity
- Difficult debugging
- Less control over the demo

The runtime only needs:

```text
Agent
Tool
Model
Workflow
State
```

---

## Ollama vs vLLM

### Decision

Use **Ollama for the 7-day MVP** unless hardware/model requirements make vLLM clearly preferable.

### Reason

Ollama provides a fast path to local model serving and is easier to operate during a hackathon.

Keep the provider interface independent so vLLM can be added later.

---

## PostgreSQL vs SQLite

### Decision

Use PostgreSQL if already comfortable with it.

Otherwise start with SQLite.

The database is not the differentiator.

---

## Microservices vs Modular Monolith

### Decision

Use a **modular monolith**.

Do not split the backend into many services during the hackathon.

```text
FastAPI
├── Agents
├── Models
├── Tools
├── Workflow
├── RAG
├── Policy
└── Audit
```

This is faster to build and debug.

---

# 45. Architecture Success Criteria

The architecture is successful if:

- A new model can be added without rewriting agents.
- A new tool can be registered without rewriting the workflow engine.
- A new workflow can be represented as a graph.
- Human approval can pause/resume execution.
- Generated code cannot directly execute on the host.
- Local knowledge can be retrieved by agents.
- Multimodal documents can be processed locally.
- Execution events reach the UI in real time.
- The complete system works with external network access disabled.

---

# 46. Final Architecture

The final 7-day MVP should conceptually be:

```text
                         USER
                           │
                           ▼
                  ┌─────────────────┐
                  │   REACT FLOW    │
                  │  VISUAL CANVAS  │
                  └────────┬────────┘
                           │
                      Workflow JSON
                           │
                           ▼
                  ┌─────────────────┐
                  │     FASTAPI     │
                  │                 │
                  │ Workflow Engine │
                  │ Agent Runtime   │
                  │ Model Router    │
                  │ Tool Registry   │
                  │ Policy Engine   │
                  │ Approval        │
                  │ Audit           │
                  └───────┬─────────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     ┌─────────┐     ┌─────────┐     ┌──────────┐
     │  LOCAL  │     │  LOCAL  │     │  LOCAL   │
     │  MODELS │     │   RAG   │     │  TOOLS   │
     │         │     │         │     │          │
     │ Ollama  │     │ Qdrant  │     │ OCR      │
     │ VLM     │     │ Embed.  │     │ PDF      │
     │ Coder   │     │ Docs    │     │ Docker   │
     └─────────┘     └─────────┘     │ DOCX     │
                                      └────┬─────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │   LOCAL     │
                                    │  ARTIFACTS  │
                                    └─────────────┘

                     INTERNET
                        ✕
                  NO RUNTIME DEPENDENCY
```

---

# 47. Final Architectural Principle

The architecture should communicate one clear idea:

> **The LLM is only one component of the system.**

The actual product is:

```text
Models
  +
Agents
  +
Tools
  +
Knowledge
  +
Workflow
  +
Human Approval
  +
Sandbox
  +
Artifacts
  +
Audit
  +
Sovereignty
```

That combination is what turns a local LLM into a **Sovereign Agentic AI Workbench**.

---

# 48. Scope Lock

For the 7-day implementation, do not introduce architectural complexity unless it directly improves one of these:

1. Sovereignty
2. Agentic execution
3. Multimodal understanding
4. Local knowledge
5. Human control
6. Secure tool execution
7. Demo reliability

**The architecture should remain a modular monolith until the MVP is proven.**

> **Build the smallest architecture that can convincingly demonstrate the complete sovereign agentic loop.**
