# Sovereign AI Workbench — Engineering Rules

**Version:** 1.0 — 7-Day Hackathon Build  
**Purpose:** Non-negotiable rules for the development team and AI coding agents

---

# 1. Purpose

This document defines the rules that every developer, AI coding agent, and contributor must follow while building the Sovereign AI Workbench.

The objective is simple:

> **Build a working sovereign agentic AI system, not a collection of impressive-looking features.**

These rules are intentionally strict because the project has only **7 days**.

---

# 2. Rule Zero — The PRD Is the Source of Truth

The PRD defines:

- Product scope
- MVP requirements
- Priority
- User workflows
- Definition of done

If a new idea conflicts with the PRD:

> **The PRD wins.**

Do not add features simply because they sound impressive.

---

# 3. Rule One — No Cloud AI at Runtime

The application must not send user data to:

- OpenAI
- Anthropic
- Google AI
- Azure OpenAI
- AWS AI services
- Cloud OCR APIs
- Cloud vision APIs
- Cloud embedding APIs
- Any other external AI API

All inference must use local models.

```text
User Data
   ↓
Local Application
   ↓
Local Model
   ↓
Local Output
```

---

# 4. Rule Two — The Sovereignty Claim Must Be Real

Do not merely display:

```text
"100% Secure"
```

or:

```text
"Air-Gapped"
```

The system must technically support offline execution.

Before the final demo:

```text
Disable internet
      ↓
Start system
      ↓
Run workflow
      ↓
Run coding agent
      ↓
Generate artifact
      ↓
Everything still works
```

This is the actual sovereignty test.

---

# 5. Rule Three — Never Fake the Sovereignty Demo

Do not:

- Fake network counters
- Hardcode "0 external calls"
- Hide external requests
- Claim air-gapped operation without testing it

If the system requires internet for something, that dependency must be identified and removed or explicitly documented.

---

# 6. Rule Four — No Generated Code on the Host

AI-generated code is untrusted.

Never execute generated code directly through:

```python
exec(...)
```

or unrestricted:

```python
subprocess.run(...)
```

on the host.

Use the sandbox:

```text
Generated Code
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
```

---

# 7. Rule Five — Sandbox Must Have No Network

The coding sandbox must run with networking disabled.

Conceptually:

```text
Docker Container
│
├── CPU limit
├── Memory limit
├── Timeout
├── Restricted filesystem
└── Network = NONE
```

The generated code must not be able to access the internet.

---

# 8. Rule Six — Agents Cannot Access the Host Directly

Agents must never receive unrestricted filesystem access.

Bad:

```text
Agent → OS filesystem
```

Good:

```text
Agent
 ↓
Tool Registry
 ↓
Policy
 ↓
Approved workspace
```

---

# 9. Rule Seven — All Tools Must Be Registered

Every tool must have a defined interface.

Examples:

```text
read_file
write_file
extract_pdf
ocr
vision_analyze
knowledge_search
execute_python
run_tests
generate_docx
```

Do not allow arbitrary tool execution.

---

# 10. Rule Eight — Every Tool Call Must Be Audited

At minimum log:

```text
timestamp
execution_id
agent
tool
input summary
status
duration
```

Do not store sensitive raw inputs in logs unless absolutely necessary.

Prefer metadata and safe summaries.

---

# 11. Rule Nine — Every Model Call Must Be Audited

Log:

```text
execution_id
agent
model
provider
task type
timestamp
status
duration
```

Example:

```text
Model:
local-coder

Provider:
ollama

Task:
coding

Status:
success
```

---

# 12. Rule Ten — Model Abstraction Is Mandatory

Agents must not directly depend on Ollama APIs.

Bad:

```text
CodingAgent → Ollama
```

Good:

```text
CodingAgent
     ↓
Model Router
     ↓
Model Provider
     ↓
Ollama
```

This makes future migration to another local inference engine possible.

---

# 13. Rule Eleven — Never Hardcode One Model

Do not write:

```text
if coding:
    use MODEL_X
```

throughout the codebase.

Use:

```text
Task
 ↓
Required capabilities
 ↓
Model Registry
 ↓
Router
 ↓
Suitable model
```

---

# 14. Rule Twelve — Model Selection Must Be Explainable

The system should be able to answer:

> "Why was this model selected?"

Example:

```text
Task:
Analyze scanned inspection report

Required:
VISION
REASONING

Selected:
Local VLM

Reason:
Supports vision + reasoning
```

The reason should be visible in logs or execution details.

---

# 15. Rule Thirteen — Do Not Build a Complicated AI Router

For the 7-day MVP, model routing should be deterministic.

Use:

```text
Task Type
+
Capabilities
+
Available Models
```

Do not build a second LLM whose only job is to choose another LLM.

---

# 16. Rule Fourteen — Agents Must Be Modular

Every agent should have:

```text
name
description
capabilities
tools
input
output
run()
```

Agents should not contain unrelated infrastructure logic.

---

# 17. Rule Fifteen — Workflow Engine Owns Execution

The frontend defines the workflow.

The backend executes it.

```text
React Flow
 ↓
Workflow JSON
 ↓
Execution Engine
 ↓
Agents
 ↓
Tools / Models
```

Never implement workflow execution inside React components.

---

# 18. Rule Sixteen — Frontend Never Talks Directly to Infrastructure

The frontend must communicate with the backend.

Avoid:

```text
React → Ollama
React → Qdrant
React → Docker
React → filesystem
```

Use:

```text
React → FastAPI → infrastructure
```

This keeps security boundaries centralized.

---

# 19. Rule Seventeen — Use a Modular Monolith

For the 7-day build:

> **One backend application.**

Do not create unnecessary microservices.

Preferred:

```text
FastAPI
├── API
├── Agents
├── Workflow
├── Models
├── Tools
├── RAG
├── Policy
├── Approval
├── Audit
└── Artifacts
```

---

# 20. Rule Eighteen — No Kubernetes

Do not introduce:

- Kubernetes
- Helm
- Service mesh
- Distributed schedulers
- GPU orchestration

These are outside the 7-day MVP.

---

# 21. Rule Nineteen — No Premature Enterprise Architecture

Do not spend the hackathon building:

- Multi-region deployment
- High availability
- Enterprise IAM
- LDAP
- Active Directory integration
- SSO
- Multi-tenant architecture
- Distributed GPU scheduling

Those belong after the MVP.

---

# 22. Rule Twenty — Use Real Workflows

The hero workflow must actually execute:

```text
PDF
 ↓
OCR / Vision
 ↓
Knowledge Search
 ↓
Risk Analysis
 ↓
Human Approval
 ↓
DOCX
```

Do not replace the workflow with a fake pre-generated response.

---

# 23. Rule Twenty-One — Use Real Artifacts

The system must generate an actual file.

For the MVP:

```text
approval_note.docx
```

The file must be produced by the application during execution.

Do not simply show a text preview and call it a generated artifact.

---

# 24. Rule Twenty-Two — Human Approval Must Actually Pause Execution

The approval node must stop the workflow.

Correct:

```text
Risk Analyzer
      ↓
WAITING_FOR_APPROVAL
      ↓
Human
      ↓
APPROVE
      ↓
Continue
```

Do not simulate approval by automatically continuing.

---

# 25. Rule Twenty-Three — Rejection Must Work

If the user selects:

```text
REJECT
```

the workflow must respond appropriately.

At minimum:

```text
Workflow → REJECTED
```

and downstream nodes must not execute.

---

# 26. Rule Twenty-Four — State Must Be Explicit

Use explicit workflow states.

Minimum:

```text
QUEUED
RUNNING
WAITING_APPROVAL
COMPLETED
FAILED
REJECTED
```

Do not rely on UI state alone.

---

# 27. Rule Twenty-Five — Every Execution Gets an ID

Example:

```text
exec_8f92c1
```

Use the execution ID across:

- Logs
- WebSocket events
- Model calls
- Tool calls
- Approvals
- Artifacts
- Errors

This makes debugging dramatically easier.

---

# 28. Rule Twenty-Six — Use Structured Events

Do not send random text messages over WebSockets.

Use structured events.

Example:

```json
{
  "type": "node_started",
  "execution_id": "exec_123",
  "node_id": "risk",
  "timestamp": "..."
}
```

---

# 29. Rule Twenty-Seven — Streaming Must Be Real

If the UI displays token streaming, it should come from the actual local model response.

Do not fake token-by-token output with timers.

---

# 30. Rule Twenty-Eight — Fail Loudly

If a component fails:

```text
Model unavailable
```

should produce:

```text
FAILED
Reason:
Local model unavailable
```

Never silently return fabricated output.

---

# 31. Rule Twenty-Nine — Never Hide Errors During Development

Development logs should contain enough information to debug failures.

Use:

```text
execution_id
node_id
agent
error type
error message
stack trace
```

Do not swallow exceptions.

---

# 32. Rule Thirty — Never Fabricate AI Output

If the model fails, do not return:

```text
"Everything looks good."
```

just to keep the workflow running.

The correct behavior is:

```text
MODEL_ERROR
```

---

# 33. Rule Thirty-One — Preserve Evidence

When RAG or document analysis produces findings, retain references where possible.

Example:

```text
Finding:
Corrosion observed

Source:
inspection_report.pdf
Page:
7
```

For RAG:

```text
Source:
safety_manual.pdf
Page:
32
```

The final artifact should include evidence references.

---

# 34. Rule Thirty-Two — RAG Must Be Local

Embeddings must be generated locally.

Vector search must happen locally.

Documents must remain local.

Preferred:

```text
Documents
 ↓
Local Embedding Model
 ↓
Qdrant
 ↓
Local Retrieval
```

---

# 35. Rule Thirty-Three — No External Embedding APIs

Do not use cloud embeddings.

Avoid:

```text
OpenAI embeddings
Cohere embeddings
Voyage embeddings
```

for the MVP.

Use a local embedding model.

---

# 36. Rule Thirty-Four — Keep the Knowledge Base Small

The demo does not need millions of documents.

Use a small but realistic dataset:

```text
5–20 documents
```

with good metadata and relevant content.

Quality matters more than quantity.

---

# 37. Rule Thirty-Five — Document Processing Must Be Local

PDF extraction, OCR, image processing and vision inference must remain on the machine.

Preferred pipeline:

```text
PDF
 ↓
PyMuPDF
 ↓
OCR if required
 ↓
Local VLM
```

---

# 38. Rule Thirty-Six — Treat Uploaded Files as Untrusted

Do not blindly execute:

- Macros
- Scripts
- Embedded executables
- Arbitrary attachments

The MVP should treat uploaded files as data.

---

# 39. Rule Thirty-Seven — Restrict File Paths

Never allow user-controlled paths such as:

```text
../../../../etc/passwd
```

Normalize and validate paths.

All application file operations should stay inside approved directories.

---

# 40. Rule Thirty-Eight — Secrets Never Enter Prompts

Do not put:

- API keys
- Passwords
- Tokens
- Private keys
- Database credentials

into model prompts.

The MVP should not require external API credentials at runtime.

---

# 41. Rule Thirty-Nine — No Secrets in Git

Never commit:

```text
.env
credentials
tokens
private keys
model credentials
```

Use:

```text
.env.example
```

for configuration templates.

---

# 42. Rule Forty — No Real Confidential Data for the Demo

Use:

- Synthetic data
- Sanitized documents
- Publicly safe sample documents

Do not put real defense, government, company or personal confidential information into the hackathon repository.

---

# 43. Rule Forty-One — Do Not Claim Actual Defense Certification

The project is a prototype.

Do not claim:

- Military certification
- Government accreditation
- Production air-gap certification
- Compliance certification
- Security clearance

unless independently verified.

Use language such as:

> "Designed for sovereign/on-premise deployment."

---

# 44. Rule Forty-Two — Security Claims Must Be Demonstrable

Prefer:

```text
Network disabled
```

over:

```text
Military-grade security
```

Prefer:

```text
Local model inference
```

over:

```text
100% secure AI
```

---

# 45. Rule Forty-Three — The UI Must Show What the Agent Is Doing

The user should be able to see:

```text
Reading PDF
↓
Running OCR
↓
Analyzing image
↓
Searching knowledge base
↓
Analyzing findings
↓
Waiting for approval
```

This improves both usability and the hackathon demo.

---

# 46. Rule Forty-Four — Agent Actions Must Be Visible

When an agent uses a tool, show:

```text
TOOL CALL

knowledge_search
Query:
"inspection corrosion acceptance criteria"

Status:
COMPLETED
```

For coding:

```text
TOOL CALL

execute_python

Status:
COMPLETED

Tests:
4/4 passed
```

---

# 47. Rule Forty-Five — Don't Expose Hidden Chain-of-Thought

The UI should show:

- Actions
- Tool calls
- Evidence
- Results
- Decisions
- Status

Do not attempt to expose private model chain-of-thought.

Use concise execution summaries instead.

---

# 48. Rule Forty-Six — Keep Agent Loops Bounded

Agents must not run forever.

Example:

```text
MAX_ITERATIONS = 5
```

For coding:

```text
MAX_REPAIR_ATTEMPTS = 3
```

If the limit is reached:

```text
FAILED:
Maximum iterations reached.
```

---

# 49. Rule Forty-Seven — Don't Build Fully Autonomous Agents

For the 7-day MVP, controlled agents are better than completely autonomous agents.

Preferred:

```text
Plan
 ↓
Known tools
 ↓
Bounded execution
 ↓
Verification
```

Avoid uncontrolled recursive agent loops.

---

# 50. Rule Forty-Eight — Every Agent Needs a Clear Job

Good:

```text
PDF Auditor
Risk Analyzer
Coding Agent
Document Generator
```

Bad:

```text
SuperAI
UniversalAgent
EverythingAgent
```

Each agent should have a narrow responsibility.

---

# 51. Rule Forty-Nine — Prefer Deterministic Code Over LLM Reasoning

Do not ask the LLM to do something that normal code can reliably do.

Use code for:

- Parsing JSON
- File operations
- Validation
- State transitions
- Permissions
- Timeouts
- Path validation
- Artifact creation
- Logging

Use the model for:

- Reasoning
- Classification
- Interpretation
- Summarization
- Code generation
- Visual understanding

---

# 52. Rule Fifty — Structured Outputs Wherever Possible

Prefer:

```json
{
  "severity": "high",
  "finding": "...",
  "recommendation": "...",
  "evidence": []
}
```

over unstructured text when downstream agents depend on the output.

This makes workflows more reliable.

---

# 53. Rule Fifty-One — Validate Model Outputs

If an agent expects JSON:

```text
Model
 ↓
Parse
 ↓
Validate
 ↓
Use
```

Do not blindly trust malformed model output.

---

# 54. Rule Fifty-Two — Keep Prompts Versioned

Agent prompts should live in code/configuration rather than being scattered throughout the application.

Example:

```text
prompts/
├── pdf_auditor.md
├── risk_analyzer.md
├── coding_agent.md
└── document_generator.md
```

This makes prompt iteration easier.

---

# 55. Rule Fifty-Three — Don't Overengineer Prompt Management

For the hackathon:

- Local files are enough.
- No prompt-management SaaS.
- No prompt marketplace.
- No complex version-control system.

---

# 56. Rule Fifty-Four — The Canvas Is a Product Feature

Do not make the canvas merely decorative.

A workflow displayed on the canvas must correspond to actual executable backend nodes.

```text
Canvas Node
    ↕
Workflow Node
    ↕
Agent/Tool
```

---

# 57. Rule Fifty-Five — Node Types Must Be Explicit

Example:

```text
pdf_auditor
knowledge_search
risk_analyzer
human_approval
docx_generator
coding_agent
```

Avoid arbitrary node behavior.

---

# 58. Rule Fifty-Six — Configuration Must Be Minimal

Each node should expose only the settings needed for the MVP.

Example:

```text
Risk Analyzer

Model:
[Auto]

Temperature:
[0.2]

Max iterations:
[3]
```

Do not build a giant configuration interface.

---

# 59. Rule Fifty-Seven — Auto Mode Should Be the Default

For non-technical users:

```text
Model:
AUTO
```

The system selects the appropriate local model.

Advanced model selection can exist as an optional setting.

---

# 60. Rule Fifty-Eight — Make the Demo Deterministic

Prepare known input files and expected outputs.

Do not depend on:

- Random internet resources
- Live external services
- Unpredictable datasets
- Unstable model downloads

---

# 61. Rule Fifty-Nine — Prepare a Demo Fallback

Keep:

- Pre-indexed knowledge base
- Downloaded local models
- Known-good workflow JSON
- Sample documents
- Backup generated artifacts

available locally.

The fallback must never fake execution, but it can help recover from an infrastructure failure during presentation.

---

# 62. Rule Sixty — Test Offline Before the Hackathon

At least once before the final demo:

```text
Disable Wi-Fi
Disable Ethernet
Run application
Run inspection workflow
Run coding workflow
Generate DOCX
Inspect logs
```

If anything breaks, identify why.

---

# 63. Rule Sixty-One — Don't Download Models During the Demo

Models must already exist locally.

The demo should start with:

```text
Models:
READY
```

not:

```text
Downloading 15 GB...
```

---

# 64. Rule Sixty-Two — Optimize for the Available GPU

Do not design the MVP around a 120B model if the venue machine cannot run it.

Use smaller models if required.

The architecture must remain model-agnostic.

---

# 65. Rule Sixty-Three — Prefer One Excellent Workflow Over Five Broken Ones

Priority:

```text
1. Inspection → Approval → DOCX
2. Coding → Sandbox → Verification
```

Only after these work should additional workflows be considered.

---

# 66. Rule Sixty-Four — No Feature Creep

Do not add during the 7-day build:

- Chat history systems
- Social login
- Team collaboration
- Notifications
- Mobile app
- Kubernetes
- Multi-tenancy
- Advanced analytics
- Agent marketplace

unless the core MVP is already stable.

---

# 67. Rule Sixty-Five — No UI-Only Features Before Backend Reliability

Do not spend hours polishing:

```text
animations
gradients
landing pages
logos
themes
```

while:

```text
workflow execution
```

is broken.

---

# 68. Rule Sixty-Six — But Don't Neglect Demo UX

After core functionality works, polish:

- Canvas
- Status indicators
- Execution timeline
- Approval modal
- Artifact cards
- Sovereignty dashboard

The product should look credible without sacrificing functionality.

---

# 69. Rule Sixty-Seven — Use Clear Status States

Recommended:

```text
PENDING
RUNNING
COMPLETED
WAITING
FAILED
REJECTED
```

Use consistent terminology everywhere.

---

# 70. Rule Sixty-Eight — Keep Components Small

Avoid giant files such as:

```text
App.tsx = 3000 lines
```

Prefer:

```text
components/
agents/
canvas/
execution/
approval/
artifacts/
```

---

# 71. Rule Sixty-Nine — Keep Backend Modules Separated

Avoid one massive:

```text
main.py
```

Use:

```text
agents/
models/
tools/
workflows/
knowledge/
audit/
```

---

# 72. Rule Seventy — Type Everything Practical

Frontend:

```text
TypeScript
```

Backend:

```text
Pydantic models
Type hints
```

Avoid passing arbitrary dictionaries everywhere.

---

# 73. Rule Seventy-One — API Contracts Must Be Explicit

Define request/response schemas.

Example:

```text
POST /executions

Request:
workflow_id
input_files

Response:
execution_id
status
```

---

# 74. Rule Seventy-Two — Keep Infrastructure Configurable

Do not hardcode:

```text
localhost:11434
```

throughout the application.

Use environment/configuration.

Example:

```text
OLLAMA_BASE_URL
QDRANT_URL
DATABASE_URL
ARTIFACT_DIR
SANDBOX_TIMEOUT
```

---

# 75. Rule Seventy-Three — Provide `.env.example`

Example:

```text
OLLAMA_BASE_URL=http://localhost:11434
QDRANT_URL=http://localhost:6333
DATABASE_URL=...
ARTIFACT_DIR=./data/artifacts
SANDBOX_TIMEOUT=30
```

Never commit real secrets.

---

# 76. Rule Seventy-Four — Docker Compose Must Be Reproducible

A new team member should be able to understand:

```text
docker compose up
```

and know which services are required.

Document model preparation separately.

---

# 77. Rule Seventy-Five — Health Checks Are Mandatory

The dashboard should know whether:

```text
Backend
Model server
Vector DB
Database
OCR
Sandbox
```

are available.

Example:

```text
Backend       ● READY
Model Server  ● READY
Qdrant        ● READY
OCR           ● READY
Sandbox       ● READY
```

---

# 78. Rule Seventy-Six — Graceful Degradation

If a non-essential feature is unavailable:

```text
PPTX generation unavailable
```

the core inspection workflow should still function.

Do not let optional features break the entire application.

---

# 79. Rule Seventy-Seven — Database Is Not the Product

Do not waste time optimizing database schemas.

The hackathon differentiators are:

```text
Agentic execution
Multimodal
Local
Visual workflow
Human approval
Secure tools
```

---

# 80. Rule Seventy-Eight — Keep Logs Useful

Logs should answer:

```text
What happened?
Where?
When?
Why did it fail?
Which model?
Which tool?
Which execution?
```

Avoid meaningless logs such as:

```text
hello
test
done
```

---

# 81. Rule Seventy-Nine — Never Log Sensitive Content by Default

Do not dump:

```text
full PDFs
full documents
passwords
tokens
private source code
```

into logs.

Log metadata and safe summaries.

---

# 82. Rule Eighty — Test Each Layer Independently

Minimum tests:

```text
Model provider
PDF extraction
OCR
RAG search
Tool registry
Sandbox
Workflow engine
Approval
DOCX generation
```

Then test the end-to-end workflow.

---

# 83. Rule Eighty-One — Test the Critical Path Every Day

At the end of each development day:

```text
Upload PDF
 ↓
Run workflow
 ↓
Approval
 ↓
DOCX
```

must still work.

Do not wait until Day 7 to discover that an early change broke the main demo.

---

# 84. Rule Eighty-Two — Git Discipline

Use Git.

Recommended branches:

```text
main
develop
feature/*
```

Small commits are preferred.

Example:

```text
feat: add workflow execution engine
feat: add local model provider
feat: add approval node
fix: handle failed sandbox execution
```

---

# 85. Rule Eighty-Three — Don't Commit Broken Main

Before merging:

```text
Build
Test
Run critical workflow
```

If the core workflow is broken, do not merge the change.

---

# 86. Rule Eighty-Four — Every Team Member Owns a Layer

Recommended 4-person split:

### Person 1 — Frontend

```text
Canvas
Dashboard
Execution UI
Approval UI
Sovereignty UI
```

### Person 2 — Backend / Workflow

```text
FastAPI
Workflow engine
WebSockets
State management
```

### Person 3 — AI / RAG

```text
Models
Router
OCR
Vision
Qdrant
Agents
```

### Person 4 — Security / Tools / Integration

```text
Docker sandbox
Tools
Artifact generation
Audit
Integration
```

For a 3-person team, combine:

```text
AI + Security
```

or:

```text
Frontend + UI integration
```

depending on skill distribution.

---

# 87. Rule Eighty-Five — Integrate Early

Do not let each developer work independently for six days.

By the end of:

```text
Day 2
```

the first full architecture path should exist.

By:

```text
Day 5
```

the hero workflow should work.

---

# 88. Rule Eighty-Six — Interface Contracts Before Parallel Work

Before splitting work, agree on:

```text
Workflow JSON
Agent interface
Tool interface
Model provider interface
WebSocket events
API schemas
```

This prevents integration chaos.

---

# 89. Rule Eighty-Seven — Mock Only at Boundaries

Mocks are acceptable during development.

Example:

```text
Frontend ↔ Mock API
```

But the final demo must use the real backend.

Do not mock the actual AI workflow.

---

# 90. Rule Eighty-Eight — Don't Build What the Judge Can't See or What the System Doesn't Need

Every feature should answer:

> "Does this improve the core demonstration?"

If not:

```text
DEFER
```

---

# 91. Rule Eighty-Nine — The Judge Must Understand the Architecture Quickly

The demo should make this obvious:

```text
Visual Workflow
       ↓
Local Agent
       ↓
Local Model
       ↓
Local Tools
       ↓
Human Approval
       ↓
Artifact
       ↓
Audit
```

Avoid explaining 50 infrastructure components.

---

# 92. Rule Ninety — Demo Story Is Part of Engineering

The system should be designed around this story:

> "Here is a confidential inspection report."

Then:

```text
Upload
 ↓
Read
 ↓
Understand
 ↓
Search private knowledge
 ↓
Analyze
 ↓
Ask human
 ↓
Generate approval note
```

Then:

> "Now watch the coding agent."

```text
Request
 ↓
Generate
 ↓
Sandbox
 ↓
Test
 ↓
Verify
```

Finally:

> "Now disconnect the internet."

```text
System continues working.
```

---

# 93. Rule Ninety-One — Don't Overclaim Agentic Intelligence

The MVP should honestly describe itself as:

```text
bounded agentic workflow execution
```

rather than claiming unrestricted autonomous intelligence.

---

# 94. Rule Ninety-Two — Don't Overclaim Security

The system can demonstrate:

- Local inference
- Network isolation
- Sandboxed execution
- Auditability
- Policy enforcement

It cannot automatically prove enterprise security compliance.

---

# 95. Rule Ninety-Three — Keep the Architecture Extensible, Not Complete

The architecture should make future features possible.

It does not need to implement them now.

Future examples:

```text
vLLM
Multi-GPU
Enterprise IAM
LDAP
SIEM
XLSX/PPTX
More VLMs
Advanced planners
Multi-user workflows
```

---

# 96. Rule Ninety-Four — Definition of Done

The MVP is done when all of these work:

```text
[ ] Local model
[ ] Model abstraction
[ ] Model routing
[ ] Visual canvas
[ ] Workflow execution
[ ] PDF processing
[ ] OCR
[ ] Vision
[ ] Local RAG
[ ] Human approval
[ ] DOCX generation
[ ] Coding agent
[ ] Docker sandbox
[ ] Network-disabled sandbox
[ ] Audit logs
[ ] WebSocket streaming
[ ] Sovereignty dashboard
[ ] Offline execution
```

---

# 97. Rule Ninety-Five — Final Priority Order

When there is a conflict, prioritize exactly in this order:

```text
1. Core workflow works
2. Sovereignty works
3. Secure execution works
4. Human approval works
5. Multimodal processing works
6. RAG works
7. Real artifact generation works
8. Coding agent works
9. Execution visibility
10. UI polish
11. Extra features
```

---

# 98. AI Coding Agent Rules

If an AI coding agent such as Antigravity, Claude Code, Cursor, or another coding assistant is used, it must follow these additional rules.

## Before Coding

It must:

1. Read the PRD.
2. Read the Architecture document.
3. Read this Rules document.
4. Inspect the existing repository.
5. Understand existing interfaces.
6. Avoid rewriting working components unnecessarily.

---

# 99. AI Agent Must Not Rewrite the Project Without Permission

Do not:

```text
delete existing architecture
replace frameworks
rewrite backend
replace database
```

just because another implementation is preferred.

Make incremental changes.

---

# 100. AI Agent Must Respect Existing Contracts

If an interface already exists:

```text
Agent
ModelProvider
Tool
WorkflowNode
```

do not silently change it.

If a breaking change is genuinely necessary:

1. Explain the reason.
2. Identify affected components.
3. Update all consumers.
4. Test the critical workflow.

---

# 101. AI Agent Must Not Add Dependencies Casually

Before adding a dependency, ask:

```text
Is it necessary?
Can existing dependencies solve this?
Will it work offline?
Will it complicate deployment?
```

Avoid dependency bloat.

---

# 102. AI Agent Must Prefer Simple Solutions

For a 7-day project:

```text
20 lines of understandable code
```

is often better than:

```text
500 lines of abstraction
```

---

# 103. AI Agent Must Not Invent APIs

Do not assume a library supports an API.

Verify the installed version/documentation when necessary.

---

# 104. AI Agent Must Not Fake Missing Infrastructure

If:

```text
Ollama unavailable
```

the agent should report that.

It should not create fake responses to hide the issue.

---

# 105. AI Agent Must Test Its Changes

After significant implementation:

```text
Run tests
Build
Start services
Run critical workflow
```

Do not simply say:

```text
"Implementation complete."
```

without verification.

---

# 106. AI Agent Must Preserve Offline Compatibility

Before adding a dependency, consider:

```text
Can it run without internet?
Does it download resources dynamically?
Does it call external APIs?
```

Anything requiring runtime internet access should be rejected unless explicitly approved.

---

# 107. AI Agent Must Protect the Core Workflow

Every change should preserve:

```text
PDF
 ↓
Analysis
 ↓
RAG
 ↓
Approval
 ↓
DOCX
```

and:

```text
Coding
 ↓
Sandbox
 ↓
Verification
```

---

# 108. Final Engineering Rule

When in doubt, ask:

> **Does this make the sovereign agentic workflow more real, more secure, more reliable, or easier to demonstrate?**

If the answer is no:

> **Don't build it during the 7-day hackathon.**

---

# Final Rule

## BUILD THE DEMO, NOT THE DREAM.

The complete enterprise platform can come later.

For seven days, the team needs to prove one thing:

```text
CONFIDENTIAL INPUT
       ↓
LOCAL MULTIMODAL AI
       ↓
AGENTIC WORKFLOW
       ↓
LOCAL KNOWLEDGE
       ↓
SECURE TOOLS
       ↓
HUMAN APPROVAL
       ↓
VERIFIED OUTPUT
       ↓
NO CLOUD
```

**If this loop works reliably, the project is a strong hackathon MVP.**
