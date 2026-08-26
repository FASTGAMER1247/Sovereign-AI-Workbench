import type {
  ChatRequest,
  ChatResponse,
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
  ModelHealthResponse,
  RAGAuditRequest,
  RAGAuditResponse,
} from '../types'

const BASE_URL = '/api'

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

/** Send a chat prompt to the FastAPI backend → Ollama */
export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(request),
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


