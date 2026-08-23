import { useState, useRef, KeyboardEvent } from 'react'
import { Send, X } from 'lucide-react'
import type { AppSystemState } from '../types'

interface PromptBoxProps {
  onSubmit: (prompt: string) => void
  isGenerating: boolean
  onCancel?: () => void
  systemState: AppSystemState
}

export function PromptBox({ onSubmit, isGenerating, onCancel, systemState }: PromptBoxProps) {
  const [prompt, setPrompt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isReady =
    systemState.backendStatus === 'online' &&
    systemState.modelStatus === 'online'

  const canSubmit = isReady && prompt.trim().length > 0 && !isGenerating

  function handleSubmit() {
    if (!canSubmit) return
    const trimmed = prompt.trim()
    onSubmit(trimmed)
    setPrompt('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const model = systemState.modelHealth?.default_model ?? 'not connected'

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Prompt</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          → {model}
        </span>
      </div>

      <div className="card-body">
        <div className="prompt-section">
          <textarea
            ref={textareaRef}
            id="prompt-input"
            className="prompt-textarea"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isReady
                ? 'Waiting for backend and Ollama to be online…'
                : 'Enter a prompt for the local AI model… (Ctrl+Enter to send)'
            }
            disabled={!isReady || isGenerating}
            rows={4}
          />

          <div className="prompt-footer">
            <span className="prompt-meta">
              {prompt.trim().length > 0
                ? `${prompt.trim().length} chars`
                : 'Ctrl+Enter to send'}
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isGenerating && onCancel && (
                <button
                  id="btn-cancel"
                  className="btn btn-ghost"
                  onClick={onCancel}
                >
                  <X size={13} />
                  Cancel
                </button>
              )}
              <button
                id="btn-submit-prompt"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
