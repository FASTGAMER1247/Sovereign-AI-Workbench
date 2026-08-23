# Sovereign AI Workbench — 7-Day Implementation Phases

**Version:** 1.0  
**Build Duration:** 7 Days  
**Team:** 3–4 people  
**Objective:** Deliver a convincing, working sovereign agentic AI MVP for the hackathon.

---

# 1. Overall Strategy

The project should **not** be built feature-by-feature in isolation.

Build it as a sequence of increasingly complete vertical slices:

```text
PHASE 0
Foundation
    ↓
PHASE 1
Local AI
    ↓
PHASE 2
Agentic Workflow
    ↓
PHASE 3
Multimodal + RAG
    ↓
PHASE 4
Human Approval + Artifacts
    ↓
PHASE 5
Secure Coding Agent
    ↓
PHASE 6
Sovereignty + Integration
    ↓
PHASE 7
Demo Hardening
```

The most important principle:

> **A working end-to-end workflow is more valuable than ten unfinished features.**

---

# 2. Phase Overview

| Phase | Focus | Target |
|---|---|---|
| Phase 0 | Planning & setup | Project skeleton |
| Phase 1 | Local model layer | Local AI working |
| Phase 2 | Workflow + agents | Agentic execution |
| Phase 3 | Multimodal + RAG | Document intelligence |
| Phase 4 | Approval + artifacts | Complete hero workflow |
| Phase 5 | Coding sandbox | Secure code agent |
| Phase 6 | Sovereignty + integration | Offline proof |
| Phase 7 | Hardening + demo | Competition-ready MVP |

---

# 3. Phase 0 — Foundation

## Timeline

**Day 1 — First part**

## Objective

Create the development foundation and eliminate integration problems early.

---

## Deliverables

```text
[ ] Git repository
[ ] Frontend project
[ ] Backend project
[ ] Docker Compose
[ ] Environment configuration
[ ] Basic API
[ ] Basic frontend
[ ] Model server running
[ ] Health checks
```

---

## Architecture

```text
React
  ↓
FastAPI
  ↓
Local Model Server
```

At the end of this phase, the frontend should be able to communicate with the backend and the backend should be able to communicate with a local model.

---

## Tasks

### Frontend

Set up:

```text
React
TypeScript
Vite
Tailwind
React Flow
Zustand
```

Create:

```text
Dashboard
Canvas
Execution panel
```

---

### Backend

Set up:

```text
FastAPI
Pydantic
WebSockets
```

Create:

```text
/api/health
/api/models
/api/workflows
/api/executions
```

---

### Infrastructure

Run locally:

```text
Backend
Frontend
Ollama
Qdrant
Database
```

Only introduce services actually needed.

---

## Exit Criteria

You can demonstrate:

```text
Browser
 ↓
Frontend
 ↓
FastAPI
 ↓
Local Model
 ↓
Response
```

---

# 4. Phase 1 — Local AI Layer

## Timeline

**Day 1 — Remaining time**

## Objective

Create a clean abstraction over local models.

---

## Deliverables

```text
[ ] Model Provider
[ ] Model Registry
[ ] Model Router
[ ] Local model health
[ ] Streaming response
[ ] Model capability metadata
```

---

## Architecture

```text
Agent
 ↓
Model Router
 ↓
Model Provider
 ↓
Ollama
 ↓
Open-Weight Model
```

---

## Model Registry

Each model should have:

```text
name
provider
capabilities
context_length
vision support
coding support
reasoning support
```

---

## Example

```json
{
  "name": "local-coder",
  "provider": "ollama",
  "capabilities": [
    "coding",
    "reasoning"
  ]
}
```

---

## Router

Use simple capability matching.

```text
Task
 ↓
Task Type
 ↓
Required Capabilities
 ↓
Available Models
 ↓
Best Compatible Model
```

---

## Example

```text
Coding Request
     ↓
CODING + REASONING
     ↓
Local Coding Model
```

```text
Image Analysis
     ↓
VISION + REASONING
     ↓
Local VLM
```

---

## Exit Criteria

The system can:

1. Detect available local models.
2. Select a model based on task requirements.
3. Generate a response.
4. Stream output.
5. Record the model selection.

---

# 5. Phase 2 — Agentic Workflow Engine

## Timeline

**Day 2**

## Objective

Turn the local model into an actual workflow-driven agent system.

---

## Deliverables

```text
[ ] Workflow schema
[ ] React Flow canvas
[ ] Node configuration
[ ] Workflow executor
[ ] Agent interface
[ ] Tool interface
[ ] WebSocket execution events
```

---

## Architecture

```text
Visual Canvas
     ↓
Workflow JSON
     ↓
Execution Engine
     ↓
Agent
     ↓
Model
```

---

# 6. Workflow Schema

Create a graph representation:

```text
Nodes
+
Edges
```

Example:

```text
PDF Auditor
     ↓
Risk Analyzer
     ↓
Human Approval
     ↓
DOCX Generator
```

---

# 7. Initial Node Types

Only implement the nodes needed for the MVP:

```text
PDF Auditor
Knowledge Search
Risk Analyzer
Human Approval
DOCX Generator
Coding Agent
```

Do not build a generic node marketplace.

---

# 8. Agent Interface

Every agent should follow the same conceptual contract:

```python
Agent:
    name
    description
    capabilities
    tools
    run(context)
```

---

# 9. Execution Engine

The engine should:

```text
Load workflow
 ↓
Validate graph
 ↓
Find starting node
 ↓
Execute node
 ↓
Store output
 ↓
Move to next node
 ↓
Repeat
```

---

# 10. Execution Events

Emit:

```text
execution_started
node_started
token
tool_started
tool_completed
node_completed
approval_required
artifact_created
execution_completed
execution_failed
```

---

## Exit Criteria

You can drag:

```text
Agent A → Agent B → Agent C
```

and actually execute the workflow.

The canvas is now a functional product feature rather than a UI mockup.

---

# 11. Phase 3 — Multimodal Document Intelligence

## Timeline

**Day 3**

## Objective

Make the system capable of understanding real-world documents rather than text-only prompts.

---

## Deliverables

```text
[ ] PDF extraction
[ ] Scanned PDF detection
[ ] OCR
[ ] Image processing
[ ] Local VLM
[ ] Evidence extraction
[ ] Structured findings
```

---

# 12. Document Pipeline

```text
PDF
 ↓
Document Detector
 ↓
 ┌───────────────┐
 │               │
Text PDF      Scanned PDF
 │               │
 ↓               ↓
Text          OCR
 │               │
 └───────┬───────┘
         ↓
   Normalized Content
         ↓
       VLM if needed
         ↓
    Structured Findings
```

---

# 13. OCR

Use a local OCR engine.

OCR should return:

```text
text
page
bounding information where useful
confidence where available
```

---

# 14. Vision

Use the local VLM for:

```text
Engineering drawings
Inspection photographs
Tables
Handwritten notes
Scanned pages
```

---

# 15. Evidence

Every important finding should retain:

```text
document
page
finding
```

Example:

```text
Finding:
Corrosion identified

Source:
inspection_report.pdf

Page:
7
```

---

## Exit Criteria

The system can upload a scanned inspection report and produce meaningful structured findings using only local processing.

---

# 16. Phase 4 — Local RAG + Human Approval + Artifacts

## Timeline

**Day 4**

## Objective

Complete the project's primary hero workflow.

This phase is the most important phase of the entire build.

---

# 17. RAG Pipeline

```text
Knowledge Documents
        ↓
Parser / OCR
        ↓
Chunking
        ↓
Local Embeddings
        ↓
Qdrant
        ↓
Retriever
        ↓
Evidence
        ↓
Agent
```

---

## Knowledge Base

Prepare:

```text
5–20 synthetic/sanitized documents
```

Examples:

```text
Safety SOP
Inspection SOP
Maintenance Manual
Approval Guidelines
Past Approval Notes
```

---

# 18. Retrieval

The agent should be able to ask:

```text
What is the acceptable corrosion threshold?
```

and retrieve relevant local evidence.

Results should include:

```text
source
page
text
relevance
```

---

# 19. Human Approval

Implement:

```text
Agent
 ↓
Approval Node
 ↓
WAITING_APPROVAL
 ↓
User
 ↓
Approve / Reject
```

The workflow must actually pause.

---

# 20. Artifact Generation

Create:

```text
approval_note.docx
```

The document should contain:

```text
Title
Executive Summary
Inspection Findings
Risk Assessment
Recommendations
Evidence
Approval Section
```

---

# 21. Hero Workflow

By the end of Day 4:

```text
Upload Inspection Report
          ↓
PDF Auditor
          ↓
OCR / Vision
          ↓
Extract Findings
          ↓
Search Local Knowledge
          ↓
Risk Analysis
          ↓
Human Approval
          ↓
Generate DOCX
```

This should be fully functional.

---

## Exit Criteria

A judge can give the system one inspection report and watch a complete workflow produce a real approval note.

---

# 22. Phase 5 — Secure Coding Agent

## Timeline

**Day 5**

## Objective

Demonstrate that the platform can perform agentic coding while keeping generated code isolated.

---

# 23. Coding Workflow

```text
User Request
     ↓
Coding Agent
     ↓
Local Coding Model
     ↓
Generate Code
     ↓
Policy Check
     ↓
Docker Sandbox
     ↓
Run Tests
     ↓
Results
     ↓
Repair if Needed
     ↓
Final Code
```

---

# 24. Sandbox

Minimum requirements:

```text
Network = disabled
CPU = limited
Memory = limited
Timeout = enforced
Filesystem = restricted
```

---

# 25. Verification Loop

Example:

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

Maximum repair attempts:

```text
3
```

---

# 26. Demo Coding Task

Use a deterministic task.

Example:

> "Write a Python function to calculate the monthly EMI for a loan and create tests for edge cases."

The agent should:

```text
Generate code
 ↓
Generate tests
 ↓
Run in sandbox
 ↓
Show test results
```

---

## Exit Criteria

The judge can see that the system:

1. Generates code.
2. Executes it.
3. Runs it inside the sandbox.
4. Has no sandbox network access.
5. Verifies the result.

---

# 27. Phase 6 — Sovereignty + Full Integration

## Timeline

**Day 6**

## Objective

Turn the individual features into one coherent sovereign platform.

---

# 28. Sovereignty Dashboard

Display:

```text
LOCAL MODELS       READY
VECTOR DATABASE    READY
OCR                READY
SANDBOX            READY
```

And:

```text
External AI Calls       0
Cloud Model Calls       0
Local Model Calls       N
Tool Calls              N
Network Violations      0
```

The counters must be based on actual application/audit data.

---

# 29. Offline Test

Disconnect:

```text
Wi-Fi
Ethernet
```

Then run:

```text
Inspection Workflow
Coding Workflow
Artifact Generation
```

Everything required for the demo must continue working.

---

# 30. Network Proof

Use real technical evidence.

Possible demonstration:

```text
Network disabled
+
Application logs
+
Sandbox network = none
```

If practical, also show a local network monitor/firewall rule.

Do not rely solely on a UI counter.

---

# 31. Full Integration

Verify:

```text
Frontend
 ↓
FastAPI
 ↓
Workflow Engine
 ↓
Agent Runtime
 ↓
Model Router
 ↓
Local Models
 ↓
Tools
 ↓
RAG
 ↓
Approval
 ↓
Artifacts
 ↓
Audit
```

---

# 32. Error Handling

Test:

```text
Model unavailable
OCR failure
Malformed PDF
RAG unavailable
Sandbox timeout
Tool failure
Approval rejection
Invalid workflow
```

The system should fail clearly.

---

## Exit Criteria

The full system works offline and both primary workflows work end-to-end.

---

# 33. Phase 7 — Hardening + Demo Preparation

## Timeline

**Day 7**

## Objective

No major architecture work.

Only:

```text
Fix
Test
Polish
Optimize
Rehearse
```

---

# 34. Day 7 Rule

> **Do not introduce major new features on Day 7.**

No:

```text
new framework
new database
new architecture
new agent framework
new model stack
```

unless absolutely required to make the existing demo work.

---

# 35. Reliability Pass

Run the hero workflow repeatedly.

Target:

```text
10 successful runs
```

without a critical failure.

If that is unrealistic because of hardware/model constraints, maximize repeatability and document the known failure mode.

---

# 36. UI Polish

Focus only on visible areas:

```text
Canvas
Execution timeline
Approval modal
Artifact panel
Sovereignty dashboard
Model selection
Tool execution
```

---

# 37. Demo Preparation

Prepare:

```text
Demo PDF
Demo knowledge base
Demo coding request
Known-good workflow
Known-good models
Backup model
Backup artifacts
```

Everything should already be local.

---

# 38. Final Demo Flow

## Scene 1 — Problem

Show:

```text
Confidential industrial document
```

Explain:

> "This information cannot be sent to public cloud AI."

---

## Scene 2 — Visual Agent Canvas

Show:

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

---

## Scene 3 — Run

Upload the report.

Show:

```text
Reading document
OCR
Vision
Knowledge search
Risk analysis
```

---

## Scene 4 — Human Approval

Show:

```text
APPROVAL REQUIRED
```

Display:

```text
Findings
Evidence
Risk
Recommendation
```

Approve.

---

## Scene 5 — Artifact

Open the actual:

```text
approval_note.docx
```

---

## Scene 6 — Coding Agent

Run:

```text
Coding Request
 ↓
Local Model
 ↓
Code
 ↓
Docker
 ↓
Tests
 ↓
PASS
```

---

## Scene 7 — Sovereignty Proof

Disconnect the network.

Run another task.

Show:

```text
External AI calls = 0
```

and actual local services/logs.

---

# 39. Team Execution Plan

## Team of 4

### Developer 1 — Frontend

Own:

```text
Canvas
Dashboard
Execution UI
Approval UI
Artifact UI
Sovereignty UI
```

---

### Developer 2 — Backend

Own:

```text
FastAPI
Workflow engine
State
WebSockets
APIs
```

---

### Developer 3 — AI

Own:

```text
Model provider
Model router
Agents
OCR
Vision
RAG
```

---

### Developer 4 — Security / Tools

Own:

```text
Docker sandbox
Tool registry
Policy engine
Audit
DOCX generation
Deployment
```

---

# 40. Team of 3

## Developer 1

```text
Frontend
+
Canvas
+
Execution UI
```

## Developer 2

```text
Backend
+
Workflow
+
APIs
+
WebSockets
```

## Developer 3

```text
Models
+
Agents
+
RAG
+
OCR
+
Sandbox
+
Artifacts
```

Security/integration should be shared.

---

# 41. Daily Integration Schedule

Every day:

```text
Morning
 ↓
Individual implementation

Afternoon
 ↓
Integration

Evening
 ↓
Critical workflow test
```

Do not wait until Day 7 to integrate.

---

# 42. Phase Gates

At the end of each phase, the team must pass a gate.

## Gate 1

```text
Frontend → Backend → Local Model
```

---

## Gate 2

```text
Canvas → Workflow → Agent → Model
```

---

## Gate 3

```text
PDF → OCR/Vision → Findings
```

---

## Gate 4

```text
Findings → RAG → Approval → DOCX
```

---

## Gate 5

```text
Code → Sandbox → Tests
```

---

## Gate 6

```text
Everything → Offline
```

---

## Gate 7

```text
Everything → Stable Demo
```

---

# 43. Priority Matrix

| Feature | Priority | Deadline |
|---|---:|---:|
| Local model | P0 | Day 1 |
| Model router | P0 | Day 1 |
| Workflow engine | P0 | Day 2 |
| Visual canvas | P0 | Day 2 |
| PDF processing | P0 | Day 3 |
| OCR | P0 | Day 3 |
| Vision | P0 | Day 3 |
| RAG | P0 | Day 4 |
| Approval | P0 | Day 4 |
| DOCX | P0 | Day 4 |
| Coding agent | P0 | Day 5 |
| Docker sandbox | P0 | Day 5 |
| Offline proof | P0 | Day 6 |
| Audit logs | P1 | Day 6 |
| UI polish | P1 | Day 7 |
| Advanced features | P2 | Only if time remains |

---

# 44. Scope Cut Order

If the team falls behind, cut in this order:

## Cut First

```text
Advanced UI animations
Extra agents
Extra artifact formats
Advanced model routing
Advanced analytics
```

## Cut Later

```text
Optional workflow templates
Complex persistence
Advanced observability
```

## Never Cut

```text
Local model
Workflow engine
Visual canvas
Multimodal input
RAG
Human approval
Real artifact
Coding sandbox
Offline capability
```

---

# 45. Final Architecture Milestone

At the end of the 7 days:

```text
                  USER
                   │
                   ▼
          ┌─────────────────┐
          │  VISUAL CANVAS  │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ WORKFLOW ENGINE │
          └────────┬────────┘
                   │
                   ▼
             ┌──────────┐
             │  AGENTS  │
             └────┬─────┘
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
    Models       RAG        Tools
       │          │          │
       └──────────┼──────────┘
                  ▼
           Human Approval
                  │
                  ▼
              Artifact
                  │
                  ▼
               Audit

        INTERNET = DISCONNECTED
```

---

# 46. Final Definition of Success

The 7-day build is successful if the team can demonstrate this sequence without relying on the cloud:

```text
1. Upload confidential document
2. Understand text + scanned/image content
3. Retrieve relevant private knowledge
4. Reason over the evidence
5. Pause for human approval
6. Generate a real DOCX artifact
7. Run a separate coding task
8. Execute generated code in an isolated sandbox
9. Verify the result
10. Disconnect the network
11. Repeat the workflow successfully
```

That is the minimum convincing proof of the concept.

---

# 47. Final Principle

Do not think:

> "We need to build an AI platform in seven days."

Think:

> "We need to build one extremely convincing sovereign agentic loop, then expose that loop through a reusable architecture."

The reusable architecture is:

```text
Visual Workflow
      ↓
Agent Runtime
      ↓
Model Router
      ↓
Local Models
      ↓
Tool Registry
      ↓
Knowledge Base
      ↓
Policy / Approval
      ↓
Sandbox
      ↓
Artifacts
      ↓
Audit
```

Everything else is secondary.

**Build the critical path first. Integrate early. Test offline. Polish last.**
