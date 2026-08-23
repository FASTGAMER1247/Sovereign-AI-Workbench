# PRD — Sovereign AI Workbench

**Version:** 1.0 — 7-Day Hackathon MVP  
**Project:** Sovereign On-Premise Agentic AI Workbench using Open-Weight Multimodal LLMs for Confidential Industrial Work  
**Team:** 3–4 developers  
**Implementation Window:** 7-10 days  
**Deployment Target:** Single local workstation/server with GPU  
**Primary Constraint:** No cloud AI/API dependency during execution

---

## 1. Executive Summary

### 1.1 Product Vision

Build a **self-hosted, air-gapped agentic AI workbench** that allows industrial and government users to perform sensitive knowledge-work tasks using open-weight multimodal AI models running entirely on their own hardware.

The product should feel less like a chatbot and more like an **AI operating environment**:

> **Select agents → visually connect them → provide confidential data → agents reason and use local tools → human approves sensitive actions → system produces a verified business artifact.**

The system must demonstrate that useful agentic AI can operate **without sending confidential information to OpenAI, Anthropic, Google, or any external AI service.**

---

# 2. Problem

Industrial, infrastructure, PSU, defense-linked and government organizations work with highly sensitive information:

- Engineering drawings
- Piping and instrumentation diagrams
- Inspection reports
- Internal SOPs
- Vendor documents
- Financial documents
- Internal correspondence
- Unreleased designs
- Source code
- Calculations
- Approval notes

Sending this information to public cloud AI systems may violate organizational security policies.

As a result, users either:

1. Perform repetitive work manually, or
2. Risk copying sensitive information into external AI tools.

Existing local AI deployments often provide only a **local chatbot**.

That is insufficient.

Users need a system that can:

- Understand documents and images
- Search internal knowledge
- Reason through multi-step tasks
- Use tools
- Execute code safely
- Ask humans for approval
- Produce actual files
- Maintain an audit trail
- Operate completely locally

---

# 3. Product Goal

The 7-day MVP must prove **one central thesis**:

> **A useful multimodal agentic AI workflow can execute entirely on-premise, use local models and tools, involve a human approval gate, and produce a real business artifact without any external AI/API calls.**

The system does **not** need to become a production enterprise platform in seven days.

It needs to provide a **credible, working vertical slice** of the final product.

---

# 4. Target Users

## Primary User — Industrial Engineer / Analyst

A person who understands the business/engineering problem but does not necessarily know how to program AI agents.

They should be able to:

1. Open the workbench.
2. Select agents.
3. Connect them visually.
4. Upload a document.
5. Run the workflow.
6. Review AI findings.
7. Approve/reject a proposed action.
8. Receive a finished artifact.

## Secondary User — AI/IT Administrator

Responsible for:

- Local models
- Knowledge sources
- Available tools
- Security policies
- System health

The MVP only needs a lightweight version of this functionality.

---

# 5. Core Product Experience

```text
                SOVEREIGN AI WORKBENCH

                        USER
                          │
                          ▼
                ┌───────────────────┐
                │   VISUAL CANVAS   │
                │                   │
                │ PDF → RAG →       │
                │ ANALYZE → APPROVE │
                │ → DOCUMENT        │
                └─────────┬─────────┘
                          │
                          ▼
                 LOCAL AGENT RUNTIME
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
     LOCAL MODELS       LOCAL RAG      LOCAL TOOLS
          │               │                │
          ▼               ▼                ▼
      Ollama           Qdrant          Docker
          │
          ▼
     OPEN-WEIGHT MODELS
          │
          ▼
       NO CLOUD
```

---

# 6. MVP Workflows

The product should have **two demonstrable workflows**.

These are more important than having dozens of features.

---

## 6.1 Workflow A — Inspection Report → Approval Note

This is the **hero workflow**.

### Input

A scanned/fictitious industrial inspection report.

Example:

```text
inspection_report.pdf
```

The report may contain:

- Text
- Tables
- Images
- Scanned pages
- Inspection observations

### Workflow

```text
PDF Upload
     ↓
PDF Auditor
     ↓
OCR / Vision
     ↓
Extract Findings
     ↓
Knowledge Search
     ↓
Risk Analysis
     ↓
Human Approval
     ↓
Approval Note Generator
     ↓
DOCX
```

### Expected Output

A professional DOCX containing:

- Report reference
- Key findings
- Evidence
- Risk classification
- Recommended action
- Approval decision
- Timestamp
- Source references

---

## 6.2 Workflow B — Coding Agent

The second workflow demonstrates that the system is not simply a document chatbot.

```text
Coding Request
      ↓
Coding Agent
      ↓
Generate Code
      ↓
Docker Sandbox
      ↓
Run Tests
      ↓
Analyze Result
      ↓
Fix if Necessary
      ↓
Verified Output
```

Example:

> "Write a Python program that calculates pressure-drop values from this input dataset."

The agent generates code.

The code is executed inside Docker.

The system reports:

```text
Generated
    ↓
Executed
    ↓
Tests passed
    ↓
Verified
```

---

# 7. Sovereignty Demonstration

This is a **first-class product feature**, not just a backend implementation detail.

The UI should contain a **Sovereignty / System Status panel**.

Example:

```text
┌─────────────────────────────────────┐
│        SOVEREIGNTY STATUS           │
├─────────────────────────────────────┤
│                                     │
│ External AI APIs       0            │
│ Cloud Model Calls      0            │
│ Local Model Calls      27           │
│ Local Tool Calls       14           │
│ Network Violations     0            │
│                                     │
│ ● LOCAL MODELS ACTIVE               │
│ ● AIR-GAPPED MODE                   │
│ ● DATA REMAINS ON DEVICE            │
│                                     │
└─────────────────────────────────────┘
```

The system should maintain an audit log containing:

```text
timestamp
execution_id
agent
model
tool
action
status
```

---

# 8. Visual Agent Canvas

The canvas is the **main differentiator**.

Use React Flow.

Users should be able to:

- Add agent nodes
- Move nodes
- Connect nodes
- Configure nodes
- Delete nodes
- Run workflow
- See node execution state

Example:

```text
┌─────────────┐
│ PDF Auditor │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Knowledge   │
│ Search      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Risk        │
│ Analyzer    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ HUMAN       │
│ APPROVAL    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ DOCX        │
│ GENERATOR   │
└─────────────┘
```

---

# 9. Agent System

The system should use a **modular agent architecture**.

## MVP Agents

### 1. PDF Auditor

Responsibilities:

- Read PDFs
- Detect scanned pages
- Extract text
- OCR when necessary
- Send visual pages to local VLM
- Produce structured findings

### 2. Knowledge Agent

Responsibilities:

- Search local organizational knowledge
- Retrieve relevant documents
- Return evidence
- Preserve source/page information

### 3. Risk Analyzer

Responsibilities:

- Analyze findings
- Compare against retrieved evidence
- Produce structured assessment
- Recommend an action

### 4. Human Approval Agent

Responsibilities:

- Pause workflow
- Present proposed action
- Wait for human decision
- Continue or terminate workflow

Possible states:

```text
WAITING_APPROVAL
APPROVED
REJECTED
```

### 5. Document Generator

Responsibilities:

- Convert structured results into DOCX
- Include evidence
- Include approval information
- Save artifact locally

### 6. Coding Agent

Responsibilities:

- Understand coding request
- Generate code
- Execute it through sandbox
- Inspect errors
- Retry/fix when appropriate
- Return verification result

---

# 10. Tool System

Agents must **never directly access arbitrary host resources**.

They use registered tools.

## Required Tools

### File Reader

```text
read_file(path)
```

Restricted to approved workspace.

### File Writer

```text
write_file(path, content)
```

Restricted to workspace/artifact directory.

### PDF Extractor

```text
extract_pdf(file)
```

### OCR

```text
ocr(image)
```

### Vision

```text
vision_analyze(image, prompt)
```

### Knowledge Search

```text
knowledge_search(query)
```

### Python Sandbox

```text
execute_python(code)
```

Must execute inside Docker.

### Test Runner

```text
run_tests(project)
```

Must execute inside Docker.

### DOCX Generator

```text
generate_docx(data)
```

---

# 11. Model Architecture

The application must **not be hardcoded to one model**.

Use a model-provider abstraction.

Conceptually:

```python
class ModelProvider:

    def generate(...):
        pass

    def stream(...):
        pass

    def capabilities(...):
        pass

    def health(...):
        pass
```

The agent should request capabilities rather than a specific model.

Example:

```text
Task:
"Analyze this scanned drawing"

Required:
VISION
LONG_CONTEXT
REASONING
```

The router selects an appropriate local model.

---

# 12. Model Router

For the 7-day MVP, the router should be **simple and deterministic**.

Do not build another complicated AI system to decide which AI to use.

Flow:

```text
Task
 ↓
Task classification
 ↓
Required capabilities
 ↓
Model registry
 ↓
Available local models
 ↓
Select model
 ↓
Execute
 ↓
Audit selection
```

Example:

```text
Coding task
      ↓
CODING capability
      ↓
Local coder model
```

and:

```text
Document/image task
      ↓
VISION capability
      ↓
Local VLM
```

---

# 13. Multimodal Processing

The system must support:

- PDFs
- Images
- Scanned documents

Pipeline:

```text
Input
 ↓
Document detector
 ↓
┌───────────────┐
│ Text PDF      │ → Text extraction
│ Scanned PDF   │ → OCR
│ Image         │ → Vision model
└───────────────┘
 ↓
Normalized evidence
 ↓
Agent
```

The multimodal pipeline must remain local.

---

# 14. Knowledge Base / RAG

The MVP requires a local organizational knowledge base.

Example:

```text
knowledge/
├── safety_manual.pdf
├── inspection_sop.pdf
├── maintenance_guidelines.pdf
└── previous_approval_notes.pdf
```

Pipeline:

```text
Documents
   ↓
Parse
   ↓
Chunk
   ↓
Local Embeddings
   ↓
Qdrant
   ↓
Search
   ↓
Relevant Evidence
   ↓
Agent
```

Every retrieved result should retain:

- Document name
- Page number where possible
- Relevant text
- Metadata

---

# 15. Human-in-the-Loop

Human approval is a mandatory MVP capability.

The system must be able to stop execution.

Example:

```text
Risk Analyzer
      ↓
Proposed action:
"Equipment requires immediate inspection."
      ↓
┌─────────────────────────────┐
│ HUMAN APPROVAL REQUIRED     │
│                             │
│ [ APPROVE ]   [ REJECT ]    │
└─────────────────────────────┘
```

Until a decision is made:

```text
Workflow Status:
WAITING FOR APPROVAL
```

---

# 16. Code Execution Security

Generated code must **never execute directly on the host**.

Required architecture:

```text
Agent
 ↓
Policy Check
 ↓
Docker Sandbox
 ↓
Network Disabled
 ↓
Resource Limits
 ↓
Execute
 ↓
stdout/stderr
 ↓
Verifier
```

Sandbox requirements:

- No network access
- CPU limit
- Memory limit
- Execution timeout
- Restricted filesystem
- No access to host secrets

---

# 17. Real-Time Execution

The UI should show execution in real time.

Example:

```text
● PDF Auditor          COMPLETED
● OCR                  COMPLETED
● Vision               COMPLETED
● Knowledge Search     COMPLETED
● Risk Analyzer        RUNNING
○ Human Approval       WAITING
○ DOCX Generator       PENDING
```

Use WebSockets.

Events should include:

```text
execution_started
node_started
token
tool_started
tool_completed
approval_required
node_completed
artifact_created
execution_completed
execution_failed
```

---

# 18. Artifact Generation

The system must produce a **real file**.

Minimum:

### DOCX

Generated approval note.

Potential later additions:

- XLSX
- PPTX
- PDF

These are not required for the 7-day MVP.

---

# 19. User Interface

## Main Screens

### 1. Dashboard

Show:

- Recent workflows
- Running executions
- Local model status
- System sovereignty status

### 2. Agent Canvas

Main workspace.

Contains:

- Node library
- Canvas
- Configuration panel
- Run button
- Execution status

### 3. Execution View

Show:

- Current node
- Logs
- Streaming output
- Tool calls
- Model used
- Execution time

### 4. Approval View

Show:

- Proposed action
- Evidence
- Confidence
- Approve/reject controls

### 5. Artifacts

Show:

- Generated files
- File type
- Execution that produced it
- Open/download action

### 6. Sovereignty Dashboard

Show:

- Model calls
- Tool calls
- External calls
- Network state
- Local services

---

# 20. Technical Architecture

```text
┌──────────────────────────────────────────────┐
│                 FRONTEND                     │
│                                              │
│ React + TypeScript + React Flow              │
│ Tailwind + Zustand + Monaco                  │
└──────────────────────┬───────────────────────┘
                       │
                 REST / WebSocket
                       │
┌──────────────────────▼───────────────────────┐
│                  FASTAPI                     │
│                                              │
│ Workflow API                                 │
│ Execution Engine                             │
│ Agent Runtime                                │
│ Tool Registry                                │
│ Model Router                                 │
│ Policy Engine                                │
│ Approval Manager                             │
│ Audit Logger                                 │
│ Artifact Manager                             │
└───────┬────────────┬────────────┬────────────┘
        │            │            │
        ▼            ▼            ▼
   ┌────────┐    ┌────────┐   ┌──────────┐
   │ Ollama │    │ Qdrant │   │  Docker  │
   │ Models │    │  RAG   │   │ Sandbox  │
   └────────┘    └────────┘   └──────────┘
        │
        ▼
 Open-weight models
```

---

# 21. Recommended Technology

## Frontend

- React
- TypeScript
- Vite
- React Flow
- Tailwind CSS
- Zustand
- Monaco Editor

## Backend

- Python
- FastAPI
- Pydantic
- AsyncIO
- WebSockets

## AI

- Ollama
- Open-weight models
- Local VLM
- Local embedding model

## RAG

- Qdrant
- BGE-M3 or equivalent
- PyMuPDF
- PaddleOCR

## Sandbox

- Docker

## Persistence

- PostgreSQL

SQLite can be used during initial development if PostgreSQL slows the team down.

## Artifacts

- python-docx

## Deployment

- Docker Compose

---

# 22. Security Requirements

The following are mandatory:

### SR-01
No external AI APIs.

### SR-02
No generated code executes directly on host.

### SR-03
Sandbox network must be disabled.

### SR-04
File access must be restricted.

### SR-05
All tool invocations must be logged.

### SR-06
Model selection must be logged.

### SR-07
Approval decisions must be logged.

### SR-08
The system must continue functioning with external internet access disabled.

---

# 23. Non-Functional Requirements

## Performance

The MVP does not need enterprise-grade throughput.

It must provide a responsive UI and visible progress.

Long-running operations must not freeze the UI.

## Reliability

The hero workflow should successfully execute repeatedly using prepared demo data.

Target:

**≥ 90% successful demo runs.**

## Extensibility

Adding another model should require adding a provider/model configuration rather than rewriting agents.

Adding another tool should require registering a tool rather than modifying every agent.

Adding another workflow should primarily involve workflow configuration.

---

# 24. P0 / P1 / P2

## P0 — MUST HAVE

```text
React Flow
FastAPI
Workflow engine
Local model
Model abstraction
Model router
PDF processing
OCR
Vision
RAG
Human approval
Docker sandbox
Coding agent
DOCX generation
WebSockets
Audit logs
Sovereignty dashboard
Docker Compose
```

## P1 — ONLY IF AHEAD

```text
XLSX
PPTX
Workflow versioning
Reranker
Advanced model dashboard
More agent templates
More policy rules
```

## P2 — DO NOT TOUCH DURING 7 DAYS

```text
Kubernetes
Distributed inference
Enterprise IAM
LDAP/AD
Multi-user collaboration
High availability
GPU scheduling
Advanced autonomous planning
Agent marketplace
Enterprise SIEM
Microservice decomposition
```

---

# 25. 7-Day Implementation Priority

## Day 1 — Foundation

```text
React
FastAPI
Docker
Ollama
Basic UI
```

**Goal:** Local model responds through the application.

## Day 2 — Agent Canvas + Runtime

```text
React Flow
Workflow JSON
Node registry
Execution engine
WebSocket events
```

**Goal:** Visual workflow actually executes.

## Day 3 — Multimodal

```text
PDF
OCR
VLM
```

**Goal:** Scanned document becomes structured findings.

## Day 4 — RAG + Routing

```text
Qdrant
Embeddings
Knowledge search
Model registry
Router
```

**Goal:** System can retrieve local organizational evidence and select appropriate local models.

## Day 5 — Approval + Artifact

```text
Approval node
Pause/resume
DOCX
Audit
```

**Goal:** Complete inspection workflow works.

## Day 6 — Coding + Sovereignty

```text
Coding agent
Docker sandbox
Verification
Network isolation
Sovereignty dashboard
```

**Goal:** Second workflow + proof of local execution.

## Day 7 — Hardening

```text
Bug fixing
UI polish
Offline testing
Performance
Demo data
Backup
Rehearsal
```

**Goal:** Demo works reliably.

---

# 26. Definition of Done

The project is considered complete when a fresh user can:

1. Open the application.
2. See local model/system status.
3. Open the visual canvas.
4. Create or load:

```text
PDF Auditor
      ↓
Knowledge Search
      ↓
Risk Analyzer
      ↓
Human Approval
      ↓
DOCX Generator
```

5. Upload a scanned report.
6. Watch the workflow execute.
7. See OCR/Vision results.
8. See local knowledge evidence.
9. Reach an approval gate.
10. Approve the recommendation.
11. Receive a DOCX approval note.
12. Run the coding workflow.
13. See generated code execute inside Docker.
14. See verification results.
15. Open sovereignty/audit view.
16. Demonstrate:

```text
External AI calls = 0
```

while the workflows actually work.

---

# 27. Demo Acceptance Test

Before the hackathon, perform this exact test with the internet disabled:

```text
[ ] Application starts
[ ] Frontend loads
[ ] Backend loads
[ ] Local model loads
[ ] Qdrant works
[ ] OCR works
[ ] VLM works
[ ] RAG works
[ ] Workflow executes
[ ] Approval pauses workflow
[ ] Approval resumes workflow
[ ] DOCX generated
[ ] Coding agent works
[ ] Docker sandbox works
[ ] Network is disabled inside sandbox
[ ] Audit logs appear
[ ] Sovereignty dashboard works
```

If any of these fail, **fix it before adding new features.**

---

# 28. Critical Product Principle

The product must **not become a chatbot with a pretty canvas**.

The judge should be able to see this chain:

```text
PERCEPTION
    ↓
REASONING
    ↓
KNOWLEDGE
    ↓
TOOL USE
    ↓
DECISION
    ↓
HUMAN CONTROL
    ↓
EXECUTION
    ↓
VERIFICATION
    ↓
ARTIFACT
    ↓
AUDIT
```

That is what makes this an **agentic workbench** rather than an LLM wrapper.

---

# 29. What We Are NOT Trying to Prove

We are not trying to prove:

> "We built an enterprise-ready AI platform in seven days."

We are proving:

> **"We built a working architectural slice of a sovereign enterprise AI platform, and the critical workflow actually runs locally from input to verified output."**

That distinction is important.

---

# 30. Final Product Statement

### One-line Pitch

> **A sovereign, visual agentic AI workbench that lets sensitive organizations run multimodal AI workflows entirely on-premise—with local models, private knowledge, secure tool execution, human approvals, and auditable business outputs.**

### Demo Pitch

> **Upload a confidential inspection report. Our local AI reads the scanned document, searches the organization's private knowledge base, analyzes the findings, asks a human for approval, and generates the approval note—all without sending a single byte to a cloud AI service. Then watch our coding agent generate and verify code inside an isolated sandbox.**

---

# 31. Final Scope Lock

**For the next 7 days, this PRD is the source of truth.**

If a proposed feature does not directly contribute to:

1. **Visual agent workflows**
2. **Local multimodal AI**
3. **Agentic tool execution**
4. **Human approval**
5. **Real business artifacts**
6. **Secure code execution**
7. **Sovereign/offline operation**

it should **not** be prioritized during the hackathon.

> **Build fewer things. Make those things actually work.**
