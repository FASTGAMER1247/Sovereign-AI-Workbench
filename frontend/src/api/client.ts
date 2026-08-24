import type {
  ChatRequest,
  ChatResponse,
  DocumentAnalysisRequest,
  DocumentAnalysisResponse,
  DocumentExtractionResponse,
  DocumentResponse,
  HealthResponse,
  ModelHealthResponse,
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

