import type {
  AuditLedgerResponse,
  ChatRequest,
  ChatResponse,
  CodingWorkflowExecution,
  CodingWorkflowRequest,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  DocumentExtractionResponse,
  DocumentResponse,
  HealthResponse,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeIngestRequest,
  KnowledgeIngestResponse,
  KnowledgeQueryRequest,
  KnowledgeQueryResponse,
  KnowledgeStatsResponse,
  LedgerIntegrityResponse,
  ModelHealthResponse,
  RAGAuditRequest,
  RAGAuditResponse,
  SandboxStatusResponse,
  SovereigntyStatusResponse,
} from '../types'

const isTauri =
  typeof window !== 'undefined' &&
  ('__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost')

export const BASE_URL = isTauri
  ? 'http://127.0.0.1:8000/api'
  : (import.meta.env.VITE_API_BASE_URL || '/api')

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }

  // Only set application/json if body is not FormData
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const body = await response.json()
      detail = body?.detail ?? detail
    } catch {
      // ignore JSON parse failures
    }
    throw new Error(detail)
  }

  return response.json() as Promise<T>
}

/** Check backend liveness */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health')
}

/** Check Ollama connectivity and model availability */
export async function getModelHealth(): Promise<ModelHealthResponse> {
  return apiFetch<ModelHealthResponse>('/models/health')
}

/** List installed local models */
export async function listModels(): Promise<{ models: unknown[]; count: number }> {
  return apiFetch('/models')
}

/** Set the default system model across backend and local providers */
export async function setDefaultModel(model: string): Promise<{ status: string; default_model: string; is_model_available: boolean; available_models: string[] }> {
  return apiFetch('/models/default', {
    method: 'POST',
    body: JSON.stringify({ model }),
  })
}

/** Trigger local download of a model via Ollama */
export async function pullModel(model: string): Promise<{ status: string; model: string; is_model_available: boolean; available_models: string[] }> {
  return apiFetch('/models/pull', {
    method: 'POST',
    body: JSON.stringify({ model }),
  })
}


/** Send a chat prompt to the FastAPI backend → Ollama */
export async function sendChat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(request),
    signal,
  })
}

// ─── Document API Client (Milestone 2) ───

/** Upload a document file (PDF, PNG, JPG, JPEG) */
export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch<DocumentResponse>('/documents/upload', {
    method: 'POST',
    body: formData,
  })
}

/** List all uploaded documents */
export async function getDocuments(): Promise<DocumentResponse[]> {
  return apiFetch<DocumentResponse[]>('/documents')
}

/** Get a single document metadata */
export async function getDocument(documentId: string): Promise<DocumentResponse> {
  return apiFetch<DocumentResponse>(`/documents/${documentId}`)
}

/** Delete an uploaded document */
export async function deleteDocument(documentId: string): Promise<{ status: string; document_id: string }> {
  return apiFetch<{ status: string; document_id: string }>(`/documents/${documentId}`, {
    method: 'DELETE',
  })
}

/** Extract text from document using PyMuPDF or local Vision */
export async function extractDocumentText(documentId: string): Promise<DocumentExtractionResponse> {
  return apiFetch<DocumentExtractionResponse>(`/documents/${documentId}/extract`, {
    method: 'POST',
  })
}

/** Run local AI analysis on document */
export async function analyzeDocument(
  documentId: string,
  request: DocumentAnalysisRequest = {},
): Promise<DocumentAnalysisResponse> {
  return apiFetch<DocumentAnalysisResponse>(`/documents/${documentId}/analyze`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// ─── Knowledge Base & RAG API Client (Milestone 3) ───

/** Ingest a document or text into the local Knowledge Base vector store */
export async function ingestKnowledge(
  request: KnowledgeIngestRequest,
): Promise<KnowledgeIngestResponse> {
  return apiFetch<KnowledgeIngestResponse>('/knowledge/ingest', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** List all documents indexed in the local Knowledge Base */
export async function getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  return apiFetch<KnowledgeDocument[]>('/knowledge/documents')
}

/** Get metadata for a specific indexed knowledge document */
export async function getKnowledgeDocument(documentId: string): Promise<KnowledgeDocument> {
  return apiFetch<KnowledgeDocument>(`/knowledge/documents/${documentId}`)
}

/** Inspect all chunks for an indexed knowledge document */
export async function getKnowledgeDocumentChunks(documentId: string): Promise<KnowledgeChunk[]> {
  return apiFetch<KnowledgeChunk[]>(`/knowledge/documents/${documentId}/chunks`)
}

/** Delete a document and its vectors from the Knowledge Base */
export async function deleteKnowledgeDocument(documentId: string): Promise<{ status: string; document_id: string }> {
  return apiFetch<{ status: string; document_id: string }>(`/knowledge/documents/${documentId}`, {
    method: 'DELETE',
  })
}

/** Query the Knowledge Base with natural language semantic search */
export async function queryKnowledgeBase(
  request: KnowledgeQueryRequest,
): Promise<KnowledgeQueryResponse> {
  return apiFetch<KnowledgeQueryResponse>('/knowledge/query', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Get Knowledge Base and vector store statistics */
export async function getKnowledgeStats(): Promise<KnowledgeStatsResponse> {
  return apiFetch<KnowledgeStatsResponse>('/knowledge/stats')
}

/** Run a RAG-grounded document audit cross-referencing organizational standards */
export async function ragAuditDocument(
  documentId: string,
  request: RAGAuditRequest = {},
): Promise<RAGAuditResponse> {
  return apiFetch<RAGAuditResponse>(`/documents/${documentId}/rag-audit`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// ─── Multi-Model Router & Workflow API Client (Milestone 4) ───

import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ModelRouteRequest,
  ModelRouteResponse,
  WorkflowExecuteRequest,
  WorkflowExecution,
} from '../types'

/** Auto-route task to optimal local model */
export async function routeModel(request: ModelRouteRequest): Promise<ModelRouteResponse> {
  return apiFetch<ModelRouteResponse>('/router/route', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Trigger autonomous Hero Workflow execution */
export async function executeWorkflow(request: WorkflowExecuteRequest): Promise<WorkflowExecution> {
  return apiFetch<WorkflowExecution>('/workflows/execute', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** List all workflow executions */
export async function listWorkflowExecutions(): Promise<WorkflowExecution[]> {
  return apiFetch<WorkflowExecution[]>('/workflows/executions')
}

/** Fetch specific execution graph & live step status */
export async function getWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
  return apiFetch<WorkflowExecution>(`/workflows/executions/${executionId}`)
}

/** Submit Human-in-the-Loop approval/rejection */
export async function submitWorkflowApproval(
  executionId: string,
  request: ApprovalDecisionRequest,
): Promise<ApprovalDecisionResponse> {
  return apiFetch<ApprovalDecisionResponse>(`/workflows/executions/${executionId}/approve`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Cancel a running workflow execution */
export async function cancelWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
  return apiFetch<WorkflowExecution>(`/workflows/executions/${executionId}/cancel`, {
    method: 'POST',
  })
}

/** Get download URL for generated DOCX approval note */
export function getArtifactDownloadUrl(executionId: string): string {
  return `${BASE_URL}/workflows/executions/${executionId}/artifact`
}

// ─── Phase 5: Coding Agent & Sandbox Client API ───

/** Launch Autonomous Coding Workflow B */
export async function executeCodingWorkflow(
  request: CodingWorkflowRequest,
): Promise<CodingWorkflowExecution> {
  return apiFetch<CodingWorkflowExecution>('/coding/execute', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** List all coding workflow executions */
export async function listCodingExecutions(): Promise<CodingWorkflowExecution[]> {
  return apiFetch<CodingWorkflowExecution[]>('/coding/executions')
}

/** Fetch specific coding execution status, code, tests, and repair timeline */
export async function getCodingExecution(executionId: string): Promise<CodingWorkflowExecution> {
  return apiFetch<CodingWorkflowExecution>(`/coding/executions/${executionId}`)
}

/** Cancel a running coding workflow */
export async function cancelCodingExecution(executionId: string): Promise<CodingWorkflowExecution> {
  return apiFetch<CodingWorkflowExecution>(`/coding/executions/${executionId}/cancel`, {
    method: 'POST',
  })
}

/** Get download URL for verified Python script artifact */
export function getCodingArtifactDownloadUrl(executionId: string): string {
  return `${BASE_URL}/coding/executions/${executionId}/artifact`
}

/** Fetch current sandbox engine health and mode */
export async function getSandboxStatus(): Promise<SandboxStatusResponse> {
  return apiFetch<SandboxStatusResponse>('/coding/sandbox/status')
}

// ─── Phase 6: Sovereignty & Cryptographic Audit Client API ───

/** Fetch current air-gap sovereignty status and score */
export async function getSovereigntyStatus(): Promise<SovereigntyStatusResponse> {
  return apiFetch<SovereigntyStatusResponse>('/sovereignty/status')
}

/** Trigger live network egress probes */
export async function probeSovereignty(): Promise<SovereigntyStatusResponse> {
  return apiFetch<SovereigntyStatusResponse>('/sovereignty/probe', {
    method: 'POST',
  })
}

/** Retrieve cryptographic audit ledger entries */
export async function getAuditLedger(
  limit: number = 100,
  eventType?: string,
): Promise<AuditLedgerResponse> {
  const query = new URLSearchParams()
  query.set('limit', String(limit))
  if (eventType) query.set('event_type', eventType)
  return apiFetch<AuditLedgerResponse>(`/audit/ledger?${query.toString()}`)
}

/** Verify SHA-256 hash-chain across all audit blocks */
export async function verifyAuditIntegrity(): Promise<LedgerIntegrityResponse> {
  return apiFetch<LedgerIntegrityResponse>('/audit/verify')
}

/** Get download URL for exported audit ledger (CSV or JSONL) */
export function getAuditExportUrl(format: 'csv' | 'jsonl' = 'csv'): string {
  return `${BASE_URL}/audit/export?format=${format}`
}

// ─── Phase 7: Demo Package Client API ───

export interface DemoSeedResponse {
  status: string
  document_id: string
  document_name: string
  sop_document_id: string
  message: string
}

/** One-click seed industrial demo package (Refinery Line 102 Inspection PDF + SOP-REF-570 in ChromaDB) */
export async function seedDemoPackage(): Promise<DemoSeedResponse> {
  return apiFetch<DemoSeedResponse>('/demo/seed', {
    method: 'POST',
  })
}



