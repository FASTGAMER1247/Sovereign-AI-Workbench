// API client — all communication goes through FastAPI backend (never directly to Ollama)
import type {
  ChatRequest,
  ChatResponse,
  HealthResponse,
  ModelHealthResponse,
} from '../types'

const BASE_URL = '/api'

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
