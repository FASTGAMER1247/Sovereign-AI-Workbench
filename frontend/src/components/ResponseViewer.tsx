import { Clock, Cpu, Hash, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ChatResponse } from '../types'
import { MessageLoading } from './ui/message-loading'

interface ResponseViewerProps {
  response: ChatResponse | null
  isGenerating: boolean
  error: string | null
  prompt: string | null
}

export function ResponseViewer({ response, isGenerating, error, prompt }: ResponseViewerProps) {
  const isEmpty = !response && !isGenerating && !error

  return (
    <div className="card response-section">
      <div className="card-header">
        <span className="card-title">Response</span>
        {response && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-success)' }}>
            <CheckCircle2 size={12} />
            Generated locally
          </span>
        )}
        {error && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-danger)' }}>
            <AlertCircle size={12} />
            Error
          </span>
        )}
      </div>

      {/* Prompt echo */}
      {prompt && (
        <div style={{
          padding: '10px 20px',
          background: 'var(--color-surface-2)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          gap: '8px',
        }}>
          <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>USER ›</span>
          <span style={{ wordBreak: 'break-word' }}>{prompt}</span>
        </div>
      )}

      {/* Body */}
      {isGenerating && (
        <div style={{ padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageLoading size={24} color="var(--color-accent)" />
        </div>
      )}

      {!isGenerating && error && (
        <div className="card-body">
          <div className="response-error">{error}</div>
        </div>
      )}

      {!isGenerating && !error && isEmpty && (
        <div className="card-body">
          <p className="response-placeholder">
            The AI response will appear here after you submit a prompt.
          </p>
        </div>
      )}

      {!isGenerating && !error && response && (
        <div className="response-content">{response.response}</div>
      )}

      {/* Metadata bar */}
      {response && (
        <div className="response-meta-bar">
          <div className="response-meta-item">
            <Cpu size={11} />
            <span>Model:</span>
            <span>{response.model}</span>
          </div>
          {response.total_duration_ms !== undefined && (
            <div className="response-meta-item">
              <Clock size={11} />
              <span>Duration:</span>
              <span>{(response.total_duration_ms / 1000).toFixed(2)}s</span>
            </div>
          )}
          {response.eval_count !== undefined && (
            <div className="response-meta-item">
              <Hash size={11} />
              <span>Tokens:</span>
              <span>
                {response.prompt_eval_count ?? '?'} prompt + {response.eval_count} completion
              </span>
            </div>
          )}
          <div className="response-meta-item" style={{ marginLeft: 'auto' }}>
            <span style={{ color: 'var(--color-sovereign)' }}>● LOCAL · NO CLOUD</span>
          </div>
        </div>
      )}
    </div>
  )
}
