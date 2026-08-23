// TypeScript contracts matching backend Pydantic schemas

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  prompt?: string
  messages?: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
}

export interface ChatResponse {
  response: string
  model: string
  provider: string
  total_duration_ms?: number
  prompt_eval_count?: number
  eval_count?: number
  created_at?: string
}

export interface HealthResponse {
  status: string
  app: string
  version: string
  sovereign_mode: boolean
}

export interface ModelHealthResponse {
  status: 'ok' | 'warning' | 'error'
  provider: string
  base_url: string
  default_model: string
  is_model_available: boolean
  available_models: string[]
  error?: string
}

export type SystemStatus = 'idle' | 'checking' | 'online' | 'error'

export interface AppSystemState {
  backendStatus: SystemStatus
  modelStatus: SystemStatus
  modelHealth: ModelHealthResponse | null
  errorMessage: string | null
}
