# Sovereign AI Workbench — Product & UI Design Specification

**Version:** 1.0  
**Build Target:** 7-Day Hackathon MVP  
**Design Goal:** Make a technically complex sovereign AI platform feel simple, trustworthy, and immediately understandable to a non-technical industrial user.

---

# 1. Design Philosophy

The product should feel like:

> **A professional industrial control room for AI workflows.**

Not:

- A generic chatbot
- A futuristic AI toy
- A developer-only dashboard
- A cluttered enterprise admin panel

The visual language should communicate:

```text
CONTROL
+
TRUST
+
PRECISION
+
LOCAL
+
PROFESSIONAL
```

---

# 2. Primary Design Principles

## 2.1 Clarity Over Decoration

Every screen should answer:

1. What is happening?
2. What is the AI doing?
3. What does the user need to do?
4. Is my data staying local?
5. What output was produced?

Avoid visual elements that do not help answer those questions.

---

## 2.2 Professional Industrial Aesthetic

Use:

- Dark neutral backgrounds
- Clean panels
- Thin borders
- Strong typography
- Restrained accent colors
- Compact data visualization
- Clear status indicators

Avoid:

- Excessive gradients
- Neon cyberpunk styling
- Giant glowing AI brains
- Excessive glassmorphism
- Cartoon illustrations
- Generic SaaS purple everywhere

The product should look credible to:

- Engineers
- Government users
- Industrial operators
- Security teams
- Technical judges

---

# 3. Design System

## 3.1 Color Strategy

Use a restrained palette.

### Base

```text
Background:
Near-black / charcoal

Surface:
Dark gray

Elevated Surface:
Slightly lighter gray

Border:
Subtle gray

Primary Text:
Near-white

Secondary Text:
Muted gray
```

### Semantic Colors

```text
Success → Green
Warning → Amber
Danger → Red
Information → Blue
Active → Accent
```

Do not use semantic colors as decoration.

They must communicate state.

---

# 4. Typography

Recommended:

```text
Inter
```

or another clean modern sans-serif.

Hierarchy:

```text
Page Title
   ↓
Section Heading
   ↓
Card Heading
   ↓
Body
   ↓
Metadata
```

Example:

```text
Sovereign Workbench
14:32
Execution #EX-1842
```

Avoid excessive font sizes.

---

# 5. Layout System

Use a desktop-first application layout.

```text
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR                                                     │
├────────────┬────────────────────────────────┬───────────────┤
│            │                                │               │
│ SIDEBAR    │        MAIN WORKSPACE          │   CONTEXT     │
│            │                                │   PANEL       │
│            │                                │               │
│            │                                │               │
└────────────┴────────────────────────────────┴───────────────┘
```

The main workspace should receive the majority of the screen.

---

# 6. Application Navigation

Recommended sidebar:

```text
Sovereign Workbench

▣ Dashboard

◈ Agent Canvas

▶ Executions

▤ Knowledge

◇ Models

□ Artifacts

◉ Security

⚙ Settings
```

At the bottom:

```text
SYSTEM STATUS
● LOCAL
● ALL SERVICES READY
```

---

# 7. Global Top Bar

The top bar should contain:

```text
Sovereign Workbench
                     Execution: #EX-1842
                     ● LOCAL MODE
                     User
```

The most important indicator is:

```text
● LOCAL MODE
```

This should always be visible.

---

# 8. Sovereignty Indicator

The sovereignty status should be impossible to miss.

Example:

```text
┌─────────────────────┐
│ ● LOCAL MODE        │
│ No external AI     │
└─────────────────────┘
```

Do not claim:

```text
100% Secure
```

Instead show verifiable system state.

---

# 9. Dashboard Design

The dashboard is the user's starting point.

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Welcome to Sovereign Workbench                             │
│ Local AI orchestration for sensitive workloads             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SYSTEM STATUS                                              │
│                                                             │
│  ● Models       ● RAG        ● OCR        ● Sandbox        │
│                                                             │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│  QUICK START             │  RECENT EXECUTIONS              │
│                          │                                  │
│  + New Workflow          │  Inspection Review      ✓       │
│  + Upload Document       │  Code Verification      ✓       │
│  + Open Canvas           │  Safety Analysis         ...    │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

# 10. Dashboard Metrics

Show only useful metrics.

```text
Active Executions
Completed Today
Local Model Calls
Artifacts Generated
```

Optional:

```text
External AI Calls
0
```

But explain that this is application/audit telemetry rather than a substitute for network enforcement.

---

# 11. Agent Canvas

The canvas is the **hero UI**.

It should immediately communicate:

> "This is an agentic AI workbench."

---

# 12. Canvas Layout

```text
┌─────────────┬───────────────────────────────────┬──────────────┐
│ NODE        │                                   │ NODE CONFIG  │
│ LIBRARY     │             CANVAS                │              │
│             │                                   │              │
│ PDF Auditor │      ┌──────────────┐             │ Name         │
│ RAG         │      │ PDF Auditor  │             │ Model        │
│ Analyzer    │      └──────┬───────┘             │ Tools        │
│ Approval    │             │                     │ Settings     │
│ DOCX        │             ▼                     │              │
│ Coding      │      ┌──────────────┐             │              │
│             │      │ Risk Agent   │             │              │
│             │      └──────┬───────┘             │              │
│             │             │                     │              │
│             │             ▼                     │              │
│             │      ┌──────────────┐             │              │
│             │      │   APPROVAL   │             │              │
│             │      └──────────────┘             │              │
└─────────────┴───────────────────────────────────┴──────────────┘
```

---

# 13. Node Library

Keep the node library small.

## Agents

```text
PDF Auditor
Risk Analyzer
Coding Agent
```

## Knowledge

```text
Knowledge Search
```

## Actions

```text
Human Approval
DOCX Generator
```

## Utility

```text
Input
Output
```

---

# 14. Agent Node Design

Every node should have a consistent visual structure.

```text
┌─────────────────────────────┐
│ ◈  PDF AUDITOR              │
│                             │
│ Reads and analyzes PDFs     │
│                             │
│ Model: AUTO                 │
│ Tools: OCR, Vision          │
│                             │
│ ● READY                     │
└─────────────────────────────┘
```

---

# 15. Node States

Nodes should visually communicate:

```text
IDLE
READY
RUNNING
WAITING
COMPLETED
FAILED
```

Example:

```text
RUNNING
┌─────────────────────────┐
│ Risk Analyzer           │
│                         │
│ ● Analyzing...          │
│ ███████████░░           │
└─────────────────────────┘
```

---

# 16. Connection Design

Edges should communicate execution flow.

```text
PDF Auditor
     │
     ▼
Risk Analyzer
     │
     ▼
Human Approval
```

During execution:

```text
ACTIVE EDGE
```

should visually stand out.

Completed edges should remain visually distinguishable from pending edges.

---

# 17. Canvas Toolbar

Top toolbar:

```text
[Save] [Run] [Stop] [Undo] [Redo] [Zoom] [Fit]
```

Primary action:

```text
▶ RUN WORKFLOW
```

Should be visually prominent.

---

# 18. Workflow Header

Above the canvas:

```text
Inspection Approval Workflow

● Draft

Last saved:
2 minutes ago

[Save] [Run]
```

When running:

```text
Inspection Approval Workflow

● RUNNING

Execution #EX-1842
```

---

# 19. Execution Monitor

The execution monitor is the second major UI.

It should feel like a live control panel.

---

# 20. Execution Timeline

Example:

```text
EXECUTION #EX-1842

✓ Workflow started
│
✓ PDF uploaded
│
✓ Text extracted
│
✓ OCR completed
│
✓ Vision analysis completed
│
✓ Knowledge search completed
│
● Risk analysis running
│
○ Human approval
│
○ DOCX generation
```

---

# 21. Agent Activity Panel

Show actions, not private reasoning.

Example:

```text
RISK ANALYZER

ACTION
Analyzing extracted inspection findings

MODEL
Local reasoning model

TOOLS
knowledge_search

STATUS
● RUNNING
```

Do not expose hidden chain-of-thought.

---

# 22. Tool Call UI

When an agent calls a tool:

```text
┌─────────────────────────────────────────┐
│ TOOL CALL                               │
│                                         │
│ knowledge_search                        │
│                                         │
│ Query                                   │
│ "corrosion acceptance threshold"        │
│                                         │
│ ● COMPLETED                             │
│                                         │
│ 4 sources retrieved                     │
└─────────────────────────────────────────┘
```

---

# 23. Model Selection UI

Show the model decision.

```text
MODEL

AUTO

Selected:
Local Vision Model

Reason:
Requires vision + reasoning

Provider:
Ollama

Status:
● LOCAL
```

This reinforces the model-agnostic architecture.

---

# 24. Human Approval Design

This is a critical product moment.

The interface must make the user feel:

> "The AI has reached a decision point, but I remain in control."

---

# 25. Approval Modal

```text
┌─────────────────────────────────────────────┐
│             APPROVAL REQUIRED               │
├─────────────────────────────────────────────┤
│                                             │
│ Risk Assessment                             │
│                                             │
│ Severity                                    │
│ HIGH                                        │
│                                             │
│ Finding                                     │
│ Corrosion detected in inspection area.      │
│                                             │
│ Evidence                                    │
│ inspection_report.pdf — Page 7              │
│                                             │
│ Recommendation                              │
│ Schedule detailed inspection.               │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ [ REJECT ]                    [ APPROVE ]   │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 26. Approval UX Rules

The approval interface must:

- Show evidence
- Show risk
- Show recommendation
- Show source
- Make the decision obvious
- Prevent accidental approval

Do not hide critical information behind multiple screens.

---

# 27. Artifact Panel

After completion:

```text
GENERATED ARTIFACT

┌─────────────────────────────┐
│ DOCX                        │
│ approval_note.docx          │
│                             │
│ Generated locally           │
│                             │
│ [Open] [Save]               │
└─────────────────────────────┘
```

---

# 28. Artifact Preview

Where practical, provide a preview.

Show:

```text
Approval Note

Executive Summary
Inspection Findings
Risk Assessment
Recommendations
Evidence
Approval
```

The actual file should remain available.

---

# 29. Knowledge Base UI

The knowledge screen should be simple.

```text
Knowledge Base

[ + Add Documents ]

Documents
─────────────────────────────────────
Safety SOP                  PDF
Inspection Manual           PDF
Maintenance Guidelines      PDF
Approval Policy             PDF

Indexed:
● READY
```

---

# 30. Knowledge Search UI

Provide:

```text
Search private knowledge...

[ Search ]
```

Results:

```text
Safety SOP
Page 32

Relevant passage...

Relevance: 0.91
```

---

# 31. Model Management UI

The user should see available local models.

```text
LOCAL MODELS

┌─────────────────────────────────────┐
│ Local Reasoning Model               │
│ Capabilities: Reasoning             │
│ Status: ● READY                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Local Coding Model                  │
│ Capabilities: Coding                │
│ Status: ● READY                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Local Vision Model                  │
│ Capabilities: Vision                │
│ Status: ● READY                     │
└─────────────────────────────────────┘
```

---

# 32. Security / Sovereignty Screen

This screen should be designed as a technical proof dashboard.

```text
SECURITY & SOVEREIGNTY

NETWORK
● OFFLINE / ISOLATED

AI PROVIDERS
● LOCAL ONLY

EXTERNAL AI CALLS
0

LOCAL MODEL CALLS
142

SANDBOX
● NETWORK DISABLED

AUDIT
● ACTIVE
```

---

# 33. Network Evidence

Where possible, show:

```text
Network Policy
──────────────────────
External AI       BLOCKED
Sandbox Network   DISABLED
Cloud APIs        NONE
```

The UI should not imply that a counter alone proves an air gap.

---

# 34. Audit Log UI

Example:

```text
AUDIT LOG

12:42:08
MODEL
local-vision
Task: image_analysis
SUCCESS

12:42:15
TOOL
knowledge_search
Query: corrosion threshold
SUCCESS

12:42:29
APPROVAL
User approved risk assessment
```

Use filters:

```text
All
Models
Tools
Approvals
Security
Errors
```

---

# 35. Coding Agent UI

The coding workflow should have its own focused execution view.

```text
CODING AGENT

Request
──────────────────────────────
Write and test an EMI calculator
──────────────────────────────

PLAN
✓ Generate implementation
✓ Generate tests
● Execute tests
○ Repair if needed

SANDBOX
Network: DISABLED
CPU: LIMITED
Memory: LIMITED

TEST RESULTS
4 / 4 PASSED
```

---

# 36. Code Viewer

Use Monaco Editor or equivalent.

Layout:

```text
┌─────────────────────────────┐
│ main.py                     │
├─────────────────────────────┤
│ def calculate_emi(...):     │
│     ...                      │
│                             │
└─────────────────────────────┘
```

Do not overwhelm the user with an IDE-like interface.

The goal is to demonstrate:

```text
Generate → Execute → Verify
```

---

# 37. Empty States

Every major screen needs a useful empty state.

Example:

```text
No workflows yet.

Build your first workflow on the Agent Canvas.

[ Create Workflow ]
```

Avoid:

```text
Nothing here.
```

---

# 38. Loading States

Never leave blank screens.

Use:

```text
Loading local models...
Indexing documents...
Running OCR...
Analyzing image...
Searching knowledge base...
Generating artifact...
```

---

# 39. Error States

Errors should explain:

```text
What failed
Why
What the user can do
```

Example:

```text
LOCAL MODEL UNAVAILABLE

The selected model is not running.

Check the local model server and try again.

[ Retry ]
```

---

# 40. Notifications

Use concise notifications.

Good:

```text
✓ Workflow completed
```

```text
⚠ Approval required
```

```text
✕ Sandbox execution failed
```

Avoid large intrusive alerts.

---

# 41. Responsive Strategy

The 7-day MVP is primarily desktop-first.

Priority:

```text
1920×1080
1440×900
1366×768
```

Do not spend significant time on mobile optimization.

The product is intended for workstation/server environments.

---

# 42. Accessibility

Minimum requirements:

- Good text contrast
- Keyboard-accessible buttons
- Clear focus states
- Status not communicated by color alone
- Descriptive labels
- Readable font sizes

---

# 43. Animation Rules

Use animation only to communicate state.

Good:

```text
Node running
Connection active
Approval arriving
Artifact generated
```

Avoid:

- Constant particle effects
- Floating backgrounds
- Excessive transitions
- Decorative animations

The application should feel fast and serious.

---

# 44. Microcopy

Use direct language.

Instead of:

```text
Let our intelligent agent magically transform your documents
```

Use:

```text
Analyze document
```

Instead of:

```text
AI is thinking...
```

Use:

```text
Risk Analyzer is analyzing findings
```

Instead of:

```text
Trust us, your data is safe
```

Use:

```text
Local inference
No external AI provider
```

---

# 45. Primary CTA Language

Use action-oriented labels.

```text
Run Workflow
Approve
Reject
Upload Document
Search Knowledge
Create Workflow
Generate Artifact
Run Code
Retry
```

Avoid vague labels:

```text
Continue
Magic
Do It
Go
```

---

# 46. Visual Hierarchy

Every screen should have one primary action.

Examples:

### Canvas

```text
RUN WORKFLOW
```

### Approval

```text
APPROVE
```

### Knowledge

```text
ADD DOCUMENTS
```

### Coding

```text
RUN / VERIFY
```

Do not make every button equally prominent.

---

# 47. Demo Mode Design

A subtle demo indicator may be useful:

```text
DEMO ENVIRONMENT
```

But do not fake functionality.

The demo environment should use:

- Local models
- Local documents
- Real workflows
- Real tool execution

---

# 48. Hero Workflow Visual Design

The primary workflow should look visually impressive without being complicated.

```text
┌────────────┐
│ PDF AUDITOR│
└─────┬──────┘
      │
      ▼
┌────────────┐
│   VISION   │
└─────┬──────┘
      │
      ▼
┌────────────┐
│ KNOWLEDGE  │
│   SEARCH   │
└─────┬──────┘
      │
      ▼
┌────────────┐
│    RISK    │
│  ANALYZER  │
└─────┬──────┘
      │
      ▼
╔════════════╗
║  APPROVAL  ║
╚══════╤═════╝
       │
       ▼
┌────────────┐
│    DOCX    │
└────────────┘
```

---

# 49. Execution Animation

When running:

```text
PDF Auditor
   ●
   │
   ▼
Vision
   ●
   │
   ▼
Knowledge Search
   ●
   │
   ▼
Risk Analyzer
  ◉ RUNNING
```

The active node should be unmistakable.

---

# 50. Sovereignty Visual Metaphor

Avoid cliché locks everywhere.

Instead use:

```text
LOCAL
```

and:

```text
ON-PREMISE
```

with a small network status indicator.

The product should communicate sovereignty through architecture and evidence rather than marketing graphics.

---

# 51. Recommended Information Architecture

```text
Dashboard
│
├── Agent Canvas
│   ├── Workflow
│   ├── Node Library
│   └── Node Configuration
│
├── Executions
│   ├── Active
│   ├── History
│   └── Execution Details
│
├── Knowledge
│   ├── Documents
│   └── Search
│
├── Models
│   ├── Available Models
│   └── Model Details
│
├── Artifacts
│
├── Security
│   ├── Sovereignty
│   └── Audit
│
└── Settings
```

---

# 52. Screen Priority for the 7-Day Build

## P0

Must build:

```text
1. Dashboard
2. Agent Canvas
3. Execution Monitor
4. Approval UI
5. Artifact UI
6. Sovereignty Dashboard
7. Coding Agent View
```

## P1

Build if time permits:

```text
Knowledge Management
Model Management
Audit Explorer
```

## P2

Do not prioritize:

```text
Advanced settings
User management
Themes
Mobile
Analytics
```

---

# 53. Component Design Rules

Use reusable components.

Recommended:

```text
StatusBadge
Panel
Card
Node
NodeHeader
ExecutionEvent
ToolCall
ModelBadge
ApprovalModal
ArtifactCard
SourceReference
MetricCard
```

Do not duplicate UI patterns.

---

# 54. Design Tokens

Centralize:

```text
spacing
radius
font sizes
border colors
surface colors
semantic states
```

This allows the UI to be changed quickly without rewriting components.

---

# 55. Frontend State Design

Use a small number of global state domains:

```text
workflowState
executionState
systemState
approvalState
artifactState
```

Avoid putting everything into one giant global store.

---

# 56. Design for Real-Time Updates

The execution monitor should update without page refresh.

Example:

```text
Backend
   ↓
WebSocket
   ↓
Execution Store
   ↓
UI
```

---

# 57. Trust UX

The user should always know:

```text
Which model?
Which tool?
Which document?
Which source?
What happened?
What needs approval?
What was generated?
```

This is particularly important because the system operates on sensitive industrial information.

---

# 58. Non-Technical User UX

The user should not need to understand:

```text
LLM
VLM
Embeddings
Vector DB
RAG
Tokens
Inference
```

The UI can expose technical details progressively.

Example:

```text
Risk Analyzer
Model: Auto

[View technical details]
```

---

# 59. Technical User UX

When requested, expose:

```text
Model
Provider
Context
Tool calls
Latency
Token stream
Sources
Sandbox status
Audit events
```

This gives the system credibility with technical judges.

---

# 60. Final Design System

The product should visually communicate:

```text
┌─────────────────────────────────────────────┐
│             SOVEREIGN WORKBENCH             │
│                                             │
│     LOCAL AI • AGENTIC • CONTROLLED         │
│                                             │
│  ┌────────────┐      ┌────────────┐         │
│  │ DOCUMENT   │ ───→ │   AGENT    │         │
│  │            │      │            │         │
│  └────────────┘      └─────┬──────┘         │
│                            │                │
│                            ▼                │
│                     ┌────────────┐          │
│                     │  APPROVAL  │          │
│                     └─────┬──────┘          │
│                           │                 │
│                           ▼                 │
│                     ┌────────────┐          │
│                     │  ARTIFACT  │          │
│                     └────────────┘          │
│                                             │
│                  ● LOCAL MODE                │
└─────────────────────────────────────────────┘
```

---

# 61. Final Design Rule

The interface must make the following story visually obvious:

```text
YOUR DATA
   ↓
STAYS LOCAL
   ↓
LOCAL AI
   ↓
AGENTS
   ↓
TOOLS
   ↓
HUMAN CONTROL
   ↓
VERIFIED OUTPUT
```

The product should never feel like:

> "ChatGPT, but installed locally."

It should feel like:

> **"A secure visual operating environment for local AI agents."**

That distinction is central to the product's identity and hackathon positioning.

---

# 62. 7-Day Design Execution Order

## Day 1

```text
App shell
Sidebar
Top bar
Dashboard skeleton
Design tokens
```

## Day 2

```text
Agent Canvas
Node library
Node components
Workflow toolbar
```

## Day 3

```text
Execution monitor
Node states
Tool calls
Streaming
```

## Day 4

```text
Approval modal
Knowledge UI
Artifact UI
```

## Day 5

```text
Coding agent UI
Sandbox status
Test results
```

## Day 6

```text
Sovereignty dashboard
Audit UI
System health
```

## Day 7

```text
Visual polish
Spacing
Typography
Error states
Loading states
Demo rehearsal
```

---

# 63. Design Definition of Done

The design is complete when:

```text
[ ] User can understand the product within 10 seconds
[ ] Canvas clearly shows agentic workflow
[ ] Running nodes are obvious
[ ] Tool calls are visible
[ ] Model selection is understandable
[ ] Approval is impossible to miss
[ ] Artifact generation is obvious
[ ] Local/sovereign state is always visible
[ ] Coding sandbox status is visible
[ ] Errors are understandable
[ ] No critical action requires a page refresh
[ ] Desktop layout works at 1366×768
```

---

# 64. Final Design Principle

## MAKE THE COMPLEXITY VISIBLE, NOT THE CONFUSION.

The backend may contain:

```text
Models
RAG
OCR
VLMs
Agents
Tools
Policies
Sandbox
WebSockets
Audit
```

The user should experience:

```text
BUILD
   ↓
RUN
   ↓
REVIEW
   ↓
APPROVE
   ↓
VERIFY
   ↓
DELIVER
```

That is the design target for the 7-day hackathon MVP.
