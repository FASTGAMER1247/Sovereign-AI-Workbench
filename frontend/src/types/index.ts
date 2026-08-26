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

// ─── Document Types (Milestone 2) ───

export interface DocumentResponse {
  id: string
  filename: string
  file_type: 'pdf' | 'png' | 'jpg' | 'jpeg' | string
  size_bytes: number
  created_at: string
  status: 'uploaded' | 'extracted' | 'analyzed' | 'error'
  extracted_text_preview?: string | null
  error_message?: string | null
}

export interface DocumentExtractionResponse {
  document_id: string
  filename: string
  file_type: string
  extracted_text: string
  char_count: number
  method: 'pymupdf' | 'ollama_vision' | string
}

export interface DocumentAnalysisRequest {
  prompt?: string
  model?: string
}

export interface DocumentAnalysisResponse {
  document_id: string
  filename: string
  analysis: string
  model: string
  provider: string
  duration_ms?: number
  prompt_tokens?: number
  completion_tokens?: number
  created_at: string
}

// ─── Knowledge Base & RAG Types (Milestone 3) ───

export interface KnowledgeChunk {
  id: string
  document_id: string
  filename: string
  page_number?: number | null
  chunk_index: number
  content: string
  char_count: number
}

export interface KnowledgeDocument {
  id: string
  filename: string
  file_type: string
  total_chunks: number
  indexed_at: string
  status: 'indexed' | 'processing' | 'error'
  metadata: Record<string, unknown>
}

export interface KnowledgeIngestRequest {
  document_id?: string
  title?: string
  content?: string
  metadata?: Record<string, unknown>
}

export interface KnowledgeIngestResponse {
  document_id: string
  filename: string
  total_chunks: number
  indexed_at: string
  message: string
}

export interface KnowledgeQueryRequest {
  query: string
  top_k?: number
  similarity_threshold?: number
  filter_document_id?: string
}

export interface ScoredKnowledgeChunk {
  chunk: KnowledgeChunk
  similarity_score: number
}

export interface KnowledgeQueryResponse {
  query: string
  results: ScoredKnowledgeChunk[]
  total_matched: number
  query_time_ms: number
}

export interface KnowledgeStatsResponse {
  total_documents: number
  total_chunks: number
  embedding_engine: string
  embedding_model: string
  storage_path: string
}

export interface GroundedCitation {
  document_name: string
  page_number?: number | null
  chunk_index: number
  similarity_score: number
  excerpt: string
}

export interface RAGAuditRequest {
  prompt?: string
  model?: string
  top_k_standards?: number
  filter_kb_document_ids?: string[]
}

export interface RAGAuditResponse {
  document_id: string
  filename: string
  analysis: string
  grounded_citations: GroundedCitation[]
  model: string
  provider: string
  duration_ms?: number
  prompt_tokens?: number
  completion_tokens?: number
  created_at: string
}


