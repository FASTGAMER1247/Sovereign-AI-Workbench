import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  Send,
  X,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Cpu,
  Clock,
  Square,
  ChevronRight,
} from 'lucide-react'
import { sendChat } from '../api/client'
import type { AppSystemState } from '../types'

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  model?: string
  duration_ms?: number
  tokens?: number
}

interface CopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
  systemState: AppSystemState
  initialPrompt?: string
}

const STARTER_PROMPTS = [
  'What are the minimum wall thickness limits in SOP-REF-570?',
  'How does Workflow A perform an autonomous compliance audit?',
  'Explain how this air-gapped system guarantees data sovereignty.',
  'What criteria classify an industrial inspection finding as CRITICAL?',
]

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  systemState,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to the **Sovereign AI Copilot**. All inference executes **100% on-premise** on your local hardware with zero external telemetry. How can I assist with your documents, workflows, or SOP queries today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b',
    },
  ])

  const availableModels = (systemState.modelHealth?.available_models || [

    'qwen2.5-coder:1.5b',
    'llama3.2:3b',
    'deepseek-r1:1.5b',
    'qwen3.5:0.8b',
  ]).filter((m) => !m.includes('embed'))

  const [selectedModel, setSelectedModel] = useState<string>(
    systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b'
  )

  useEffect(() => {
    if (systemState.modelHealth?.default_model) {
      setSelectedModel(systemState.modelHealth.default_model)
    }
  }, [systemState.modelHealth?.default_model])

  const [inputText, setInputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)


  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isGenerating, isOpen])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Escape key closes drawer
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Populate prompt if passed externally
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setInputText(initialPrompt)
    }
  }, [initialPrompt, isOpen])

  if (!isOpen) return null

  const isReady =
    systemState.backendStatus === 'online' &&
    systemState.modelStatus === 'online'

  async function handleSend(textToSend?: string) {
    const query = (textToSend || inputText).trim()
    if (!query || isGenerating) return

    const userMsg: CopilotMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsGenerating(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await sendChat({
        prompt: query,
        model: selectedModel || systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b',
        temperature: 0.7,
      }, controller.signal)

      if (controller.signal.aborted) return

      const assistantMsg: CopilotMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: response.model,
        duration_ms: response.total_duration_ms,
        tokens: response.eval_count,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const errorMsg: CopilotMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `**Generation Error:** ${
          err instanceof Error ? err.message : 'Failed to communicate with local Ollama runtime.'
        }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleClearChat() {
    setMessages([
      {
        id: `init_${Date.now()}`,
        role: 'assistant',
        content: 'Chat session cleared. How can I assist with your local workflows or documents?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  // Format assistant text with simple markdown formatting (code blocks, bold, headers)
  function renderFormattedContent(content: string) {
    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g)

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeLines = part.slice(3, -3).trim()
        const firstLineBreak = codeLines.indexOf('\n')
        let lang = 'code'
        let code = codeLines
        if (firstLineBreak > 0 && firstLineBreak < 20) {
          lang = codeLines.slice(0, firstLineBreak).trim() || 'code'
          code = codeLines.slice(firstLineBreak + 1)
        }

        return (
          <div
            key={index}
            style={{
              margin: '10px 0',
              borderRadius: 'var(--radius-sm)',
              background: '#090d16',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>{lang.toUpperCase()}</span>
              <button
                onClick={() => handleCopy(code, `code_${index}`)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedId === `code_${index}` ? 'var(--color-success)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                }}
              >
                {copiedId === `code_${index}` ? <Check size={11} /> : <Copy size={11} />}
                {copiedId === `code_${index}` ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#e2e8f0',
                overflowX: 'auto',
                lineHeight: 1.5,
              }}
            >
              <code>{code}</code>
            </pre>
          </div>
        )
      }

      // Format standard paragraphs with bolding
      return (
        <div key={index} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '12px' }}>
          {part.split('\n').map((line, lIdx) => {
            if (line.startsWith('### ')) {
              return <h4 key={lIdx} style={{ margin: '8px 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{line.slice(4)}</h4>
            }
            if (line.startsWith('## ')) {
              return <h3 key={lIdx} style={{ margin: '10px 0 6px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{line.slice(3)}</h3>
            }
            if (line.startsWith('* ') || line.startsWith('- ')) {
              return <div key={lIdx} style={{ paddingLeft: '12px', margin: '2px 0' }}>• {line.slice(2)}</div>
            }
            return <p key={lIdx} style={{ margin: '4px 0' }}>{line}</p>
          })}
        </div>
      )
    })
  }

  return (
    <>
      <div
        className="copilot-drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 998,
        }}
      />
      <div
        style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        height: '100vh',
        width: '540px',
        maxWidth: '92vw',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-15px 0 40px rgba(0, 0, 0, 0.6)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* —— 1. FIXED TOP HEADER —— */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Sovereign Copilot
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isReady ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isReady ? 'var(--color-success)' : 'var(--color-danger)',
                  border: isReady ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                • {isReady ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isGenerating}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-accent-teal)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  padding: '1px 4px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m === 'qwen2.5-coder:1.5b'
                      ? '⚡ qwen2.5-coder:1.5b (Fastest)'
                      : m === 'llama3.2:3b'
                      ? 'ðŸŒŸ llama3.2:3b (Knowledgeable)'
                      : m === 'deepseek-r1:1.5b'
                      ? 'ðŸ§  deepseek-r1:1.5b (Reasoning)'
                      : m}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>· Air-Gapped</span>
            </div>
          </div>
        </div>


        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-muted)',
              padding: '5px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <RotateCcw size={12} /> Clear
          </button>

          <button
            onClick={onClose}
            title="Close Drawer"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* —— 2. SCROLLABLE MESSAGE STREAM —— */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--color-bg)',
        }}
      >
        {/* Starter Chips when conversation is fresh */}
        {messages.length <= 1 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="var(--color-accent)" /> Suggested Prompts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {STARTER_PROMPTS.map((promptText, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(promptText)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'border-color var(--transition-fast)',
                  }}
                >
                  <span>{promptText}</span>
                  <ChevronRight size={12} color="var(--color-text-muted)" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              {/* Message Bubble Container */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  maxWidth: '92%',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isUser ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {isUser ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Content Box */}
                <div
                  style={{
                    background: isUser ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isUser ? '#ffffff' : 'var(--color-text-primary)',
                    border: isUser ? 'none' : '1px solid var(--color-border)',
                    borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    padding: '12px 16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    wordBreak: 'break-word',
                  }}
                >
                  {isUser ? (
                    <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div>
                      {renderFormattedContent(msg.content)}

                      {/* Assistant Metadata & Copy Bar */}
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {msg.duration_ms !== undefined && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} /> {(msg.duration_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                          {msg.tokens !== undefined && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Cpu size={10} /> {msg.tokens} tokens
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: copiedId === msg.id ? 'var(--color-success)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                          }}
                        >
                          {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                          {copiedId === msg.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  padding: '0 4px',
                }}
              >
                {msg.timestamp}
              </span>
            </div>
          )
        })}

        {/* In-flight typing indicator */}
        {isGenerating && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
              }}
            >
              <Bot size={13} />
            </div>
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px 12px 12px 2px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              <span className="spinner" style={{ width: '10px', height: '10px' }} />
              Local model is reasoning...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* —— 3. FIXED BOTTOM INPUT DOCK —— */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isReady || isGenerating}
            placeholder={
              !isReady
                ? 'Waiting for local model to connect...'
                : 'Ask Sovereign Copilot anything... (Enter to send, Shift+Enter for newline)'
            }
            style={{
              width: '100%',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 42px 8px 10px',
              fontSize: '12px',
              color: 'var(--color-text-primary)',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.4,
              fontFamily: 'inherit',
            }}
          />

          {isGenerating ? (
            <button
              onClick={handleStop}
              title="Stop Generation"
              style={{
                position: 'absolute',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--color-danger)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Square size={12} fill="#fff" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!isReady || inputText.trim().length === 0}
              title="Send Message"
              style={{
                position: 'absolute',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: inputText.trim().length > 0 ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.05)',
                color: inputText.trim().length > 0 ? '#fff' : 'var(--color-text-muted)',
                cursor: inputText.trim().length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Send size={13} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>Enter to send · Shift+Enter for newline</span>
          <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>• 100% AIR-GAPPED</span>
        </div>
      </div>
    </div>
    </>
  )
}
