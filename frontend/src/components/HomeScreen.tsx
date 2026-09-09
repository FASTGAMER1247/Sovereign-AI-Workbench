import React, { useState, useEffect, useRef, KeyboardEvent } from 'react'
import {
  Shield,
  Send,
  Square,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  Sparkles,
  Bot,
  Paperclip,
  X,
  History,
  Trash2,
  Plus,
  FileText,
} from 'lucide-react'
import {
  sendChat,
  listModels,
  uploadDocument,
  extractDocumentText,
} from '../api/client'
import type { AppSystemState } from '../types'



export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  model?: string
  duration_ms?: number
  tokens?: number
  attachedFiles?: Array<{ name: string; size: number }>
}

export interface AttachedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: CopilotMessage[]
}

interface HomeScreenProps {
  systemState: AppSystemState
  onSelectWorkflowMode: (mode: 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => void
  initialPrompt?: string
  onTriggerDemo?: () => void
  isSeedingDemo?: boolean
}

const STORAGE_KEY = 'sovereign_copilot_chat_sessions_v1'

function loadSavedSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as ChatSession[]
    }
  } catch {
    // ignore
  }
  return []
}

function persistSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  systemState,
  onSelectWorkflowMode: _onSelectWorkflowMode,
  initialPrompt,
  onTriggerDemo: _onTriggerDemo,
  isSeedingDemo: _isSeedingDemo = false,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [inputText, setInputText] = useState<string>('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Sessions / History
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSavedSessions())
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false)

  const [availableModels, setAvailableModels] = useState<string[]>([
    'qwen2.5-coder:1.5b',
    'qwen2.5:3b',
    'qwen3.5:0.8b',
  ])
  const [selectedModel, setSelectedModel] = useState<string>(
    systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b'
  )

  useEffect(() => {
    if (systemState.modelHealth?.default_model) {
      setSelectedModel(systemState.modelHealth.default_model)
    }
  }, [systemState.modelHealth?.default_model])

  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch installed models
  useEffect(() => {
    listModels()
      .then((res) => {
        if (res.models && res.models.length > 0) {
          const names = (res.models as Array<{ name?: string }>)
            .map((m) => m.name || '')
            .filter((n) => n && !n.includes('embed'))
          if (names.length > 0) {
            setAvailableModels(names)
            if (!names.includes(selectedModel)) {
              setSelectedModel(names[0])
            }
          }
        }
      })
      .catch(() => {})
  }, [selectedModel])

  // Click outside to close model dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showModelDropdown])

  // Handle external initialPrompt injection
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt.trim())
    }
  }, [initialPrompt])

  // Auto-scroll when in chat mode
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isGenerating])

  // Focus textarea on load
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-save active session whenever messages change
  useEffect(() => {
    if (messages.length === 0) return

    const now = Date.now()
    if (activeSessionId) {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages, updatedAt: now }
            : s
        )
        persistSessions(updated)
        return updated
      })
    } else {
      // Create new session from first message
      const firstUserMsg = messages.find((m) => m.role === 'user')
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '') : 'New Conversation'
      const newId = `session_${now}`
      const newSession: ChatSession = {
        id: newId,
        title,
        createdAt: now,
        updatedAt: now,
        messages,
      }
      setActiveSessionId(newId)
      setSessions((prev) => {
        const updated = [newSession, ...prev]
        persistSessions(updated)
        return updated
      })
    }
  }, [messages, activeSessionId])

  // File selection handler
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return

    const newFiles: AttachedFile[] = Array.from(e.target.files).map((f) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
    }))

    setAttachedFiles((prev) => [...prev, ...newFiles])
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    textareaRef.current?.focus()
  }

  function handleRemoveFile(fileId: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  // Read content from files to inject into prompt context
  async function extractContentFromFiles(files: AttachedFile[]): Promise<string> {
    const fileExtracts: string[] = []

    for (const item of files) {
      const f = item.file
      // Text, Code, CSV, JSON, Python, Markdown
      if (
        f.type.startsWith('text/') ||
        f.name.endsWith('.txt') ||
        f.name.endsWith('.csv') ||
        f.name.endsWith('.json') ||
        f.name.endsWith('.py') ||
        f.name.endsWith('.md') ||
        f.name.endsWith('.yaml') ||
        f.name.endsWith('.yml') ||
        f.name.endsWith('.log')
      ) {
        try {
          const text = await f.text()
          fileExtracts.push(`[Attached Document: ${f.name}]\n${text.slice(0, 8000)}`)
        } catch {
          fileExtracts.push(`[Attached Document: ${f.name} (${(f.size / 1024).toFixed(1)} KB)]`)
        }
      } else {
        // PDF or Image: Upload to backend document pipeline and extract text
        try {
          const uploaded = await uploadDocument(f)
          const extracted = await extractDocumentText(uploaded.id)
          if (extracted.extracted_text) {
            fileExtracts.push(`[Attached Document (Extracted): ${f.name}]\n${extracted.extracted_text.slice(0, 8000)}`)
          } else {
            fileExtracts.push(`[Attached Document: ${f.name} (ID: ${uploaded.id})]`)
          }
        } catch {
          fileExtracts.push(`[Attached Document: ${f.name} (${(f.size / 1024).toFixed(1)} KB)]`)
        }
      }
    }

    return fileExtracts.join('\n\n')
  }

  async function handleSend(textToSend?: string) {
    const query = (textToSend || inputText).trim()
    if (!query && attachedFiles.length === 0) return
    if (isGenerating) return

    const currentFiles = [...attachedFiles]
    setAttachedFiles([])
    setInputText('')

    // Display user message with attached file metadata
    const userMsg: CopilotMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query || (currentFiles.length > 0 ? `Analyzed attached document: ${currentFiles.map((f) => f.name).join(', ')}` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFiles: currentFiles.map((f) => ({ name: f.name, size: f.size })),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsGenerating(true)

    let promptWithContext = query
    if (currentFiles.length > 0) {
      setIsProcessingFiles(true)
      try {
        const fileContent = await extractContentFromFiles(currentFiles)
        promptWithContext = `${fileContent}\n\n[User Instruction]:\n${query || 'Please summarize and inspect the attached document.'}`
      } catch {
        promptWithContext = query
      } finally {
        setIsProcessingFiles(false)
      }
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await sendChat(
        {
          prompt: promptWithContext,
          model: selectedModel || systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b',
          temperature: 0.7,
        },
        controller.signal
      )

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

  function handleNewChat() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setMessages([])
    setActiveSessionId(null)
    setInputText('')
    setAttachedFiles([])
    setIsGenerating(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleCloseChat() {
    handleNewChat()
  }

  function handleLoadSession(session: ChatSession) {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setIsGenerating(false)
    setInputText('')
    setAttachedFiles([])
    setShowHistoryPanel(false)
  }

  function handleDeleteSession(sessionId: string) {
    const updated = sessions.filter((s) => s.id !== sessionId)
    setSessions(updated)
    persistSessions(updated)
    if (activeSessionId === sessionId) {
      handleNewChat()
    }
  }

  function renderFormattedContent(content: string) {
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
              margin: '14px 0',
              borderRadius: '8px',
              background: '#0D0F14',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '11px',
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
                  fontSize: '11px',
                }}
              >
                {copiedId === `code_${index}` ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === `code_${index}` ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '14px',
                overflowX: 'auto',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.6,
              }}
            >
              <code>{code}</code>
            </pre>
          </div>
        )
      }

      // Paragraph / markdown renderer
      const lines = part.split('\n')
      return (
        <div key={index} style={{ lineHeight: 1.65, fontSize: '13.5px' }}>
          {lines.map((line, lIdx) => {
            if (line.startsWith('### ')) {
              return (
                <h4 key={lIdx} style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 6px 0', color: 'var(--color-text-primary)' }}>
                  {line.slice(4)}
                </h4>
              )
            }
            if (line.startsWith('## ')) {
              return (
                <h3 key={lIdx} style={{ fontSize: '16px', fontWeight: 700, margin: '18px 0 8px 0', color: 'var(--color-text-primary)' }}>
                  {line.slice(3)}
                </h3>
              )
            }
            if (line.startsWith('# ')) {
              return (
                <h2 key={lIdx} style={{ fontSize: '18px', fontWeight: 700, margin: '20px 0 10px 0', color: 'var(--color-text-primary)' }}>
                  {line.slice(2)}
                </h2>
              )
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0' }}>
                  <span style={{ color: 'var(--color-accent)', marginTop: '4px' }}>•</span>
                  <span>{renderBoldInline(line.slice(2))}</span>
                </div>
              )
            }
            if (!line.trim()) {
              return <div key={lIdx} style={{ height: '8px' }} />
            }
            return (
              <p key={lIdx} style={{ margin: '4px 0' }}>
                {renderBoldInline(line)}
              </p>
            )
          })}
        </div>
      )
    })
  }

  function renderBoldInline(text: string) {
    const boldParts = text.split(/(\*\*.*?\*\*)/g)
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return (
          <strong key={bIdx} style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            {bPart.slice(2, -2)}
          </strong>
        )
      }
      return bPart
    })
  }

  /* ── SHARED PROMPT INPUT CARD (CLAUDE-STYLE WITH IN-BOX MODEL SELECTOR & ATTACHMENT) ── */
  const renderPromptBox = (isBottomDock: boolean) => (
    <div
      style={{
        width: '100%',
        maxWidth: '820px',
        background: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: isBottomDock ? '0 12px 36px rgba(0, 0, 0, 0.5)' : 'var(--shadow-sm)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color var(--transition-fast)',
      }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        style={{ display: 'none' }}
      />

      {/* Attached Files Badge Bar */}
      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: '4px' }}>
          {attachedFiles.map((af) => (
            <div
              key={af.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                color: 'var(--color-text-primary)',
              }}
            >
              <FileText size={12} color="var(--color-accent)" />
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {af.name}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                ({(af.size / 1024).toFixed(0)} KB)
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(af.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove attachment"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={isBottomDock ? 2 : 3}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={attachedFiles.length > 0 ? "Ask anything about the attached files, or describe the analysis..." : "Query plant SOPs, inspect document compliance thresholds, or request sandboxed Python routines..."}
        disabled={isGenerating || isProcessingFiles}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-primary)',
          fontSize: '13.5px',
          lineHeight: 1.55,
          outline: 'none',
          resize: 'none',
          fontFamily: 'inherit',
        }}
      />

      {/* BOTTOM ACTION BAR INSIDE THE TYPING SECTION (CLAUDE-STYLE) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '10px',
        }}
      >
        {/* Left: Attachments + Model Selector Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-sm btn-ghost"
            style={{
              padding: '4px 8px',
              height: '26px',
              fontSize: '11px',
              gap: '4px',
              color: attachedFiles.length > 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
            title="Attach files (PDF, TXT, CSV, JSON, Python, Docs)"
          >
            <Paperclip size={13} />
            <span>Attach</span>
          </button>

          {/* Model Selector Pill inside the typing bar */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '4px 10px',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              title="Select Local Inference Model"
            >
              <Sparkles size={11} color="var(--color-accent)" />
              <span>{selectedModel}</span>
              <ChevronDown size={11} color="var(--color-text-muted)" />
            </button>

            {/* Model Selector Dropdown Popover */}
            {showModelDropdown && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '8px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  zIndex: 100,
                  minWidth: '200px',
                  overflow: 'hidden',
                  padding: '4px 0',
                }}
              >
                <div style={{ padding: '6px 12px', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  Installed Local Models
                </div>
                {availableModels.map((m) => (
                  <div
                    key={m}
                    onClick={() => {
                      setSelectedModel(m)
                      setShowModelDropdown(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: selectedModel === m ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      background: selectedModel === m ? 'var(--color-accent-bg)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{m}</span>
                    {selectedModel === m && <Check size={12} color="var(--color-accent)" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Send or Stop Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isProcessingFiles ? (
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Reading files...
            </span>
          ) : null}

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStop}
              className="btn btn-danger"
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
              }}
              title="Stop Generation"
            >
              <Square size={12} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isProcessingFiles}
              className="btn btn-primary"
              style={{
                width: '32px',
                height: '32px',
                padding: 0,
                borderRadius: '8px',
                flexShrink: 0,
                opacity: (inputText.trim() || attachedFiles.length > 0) && !isProcessingFiles ? 1 : 0.4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Send message (Enter)"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  /* ── HISTORY DRAWER / SIDEBAR ── */
  const renderHistorySidebar = () => {
    if (!showHistoryPanel) return null

    return (
      <div
        style={{
          width: '280px',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <History size={13} color="var(--color-accent)" />
            Chat History
          </span>
          <button
            onClick={() => setShowHistoryPanel(false)}
            className="btn btn-sm btn-ghost"
            style={{ width: '24px', height: '24px', padding: 0 }}
            title="Close history panel"
          >
            <X size={13} />
          </button>
        </div>

        {/* New Chat action inside history */}
        <div style={{ padding: '10px 14px' }}>
          <button
            onClick={handleNewChat}
            className="btn btn-sm btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              gap: '6px',
              fontSize: '11.5px',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Plus size={13} color="var(--color-accent)" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 10px 12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {sessions.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', padding: '24px 8px', textAlign: 'center' }}>
              No saved conversations yet. Conversations are automatically saved here.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleLoadSession(s)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: activeSessionId === s.id ? 'var(--color-accent-bg)' : 'transparent',
                  border: activeSessionId === s.id ? '1px solid var(--color-accent-border)' : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px', color: activeSessionId === s.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', flex: 1 }}>
                  {s.title}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSession(s.id)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.6,
                  }}
                  title="Delete session"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /* CASE 1: ACTIVE CHAT VIEW (RUNS ON THIS SCREEN WITHOUT CHANGING SCREEN) */
  /* ══════════════════════════════════════════════════════════════════════ */
  if (messages.length > 0) {
    return (
      <div
        style={{
          display: 'flex',
          height: 'calc(100vh - 52px)',
          background: 'var(--color-bg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left History Sidebar */}
        {renderHistorySidebar()}

        {/* Main Conversation Stream */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
          {/* Top Control Bar with History, New Chat, and Close Chat buttons */}
          <div
            style={{
              height: '46px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 24px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: '11px', gap: '5px', color: showHistoryPanel ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                title="Toggle chat history panel"
              >
                <History size={13} />
                <span>History ({sessions.length})</span>
              </button>

              <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'var(--color-accent-bg)',
                    border: '1px solid var(--color-accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)',
                  }}
                >
                  <Bot size={13} />
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Sovereign Copilot
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  · {selectedModel}
                </span>
              </div>
            </div>

            {/* Right: New Chat and Close Chat */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleNewChat}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: '11px', gap: '5px' }}
                title="Start a fresh chat"
              >
                <RotateCcw size={12} />
                <span>New Chat</span>
              </button>

              <button
                onClick={handleCloseChat}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: '11px', gap: '5px', color: 'var(--color-text-muted)' }}
                title="Close chat and return to home screen"
              >
                <X size={13} />
                <span>Close Chat</span>
              </button>
            </div>
          </div>

          {/* Scrollable Conversation Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 20px 140px 20px',
            }}
          >
            <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {messages.map((msg) => {
                const isUser = msg.role === 'user'

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      gap: '6px',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      <span style={{ fontWeight: 600, color: isUser ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
                        {isUser ? 'You' : 'Sovereign Copilot'}
                      </span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                      {msg.tokens && (
                        <>
                          <span>·</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{msg.tokens} tokens ({((msg.duration_ms || 0) / 1000).toFixed(1)}s)</span>
                        </>
                      )}
                    </div>

                    {isUser ? (
                      <div
                        style={{
                          background: 'var(--color-accent)',
                          color: '#ffffff',
                          borderRadius: '16px 16px 4px 16px',
                          padding: '12px 18px',
                          maxWidth: '75%',
                          fontSize: '13.5px',
                          lineHeight: 1.55,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {/* Render attached files chips inside user message */}
                        {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {msg.attachedFiles.map((af, i) => (
                              <span
                                key={i}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: 'rgba(255, 255, 255, 0.18)',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                <FileText size={11} />
                                <span>{af.name}</span>
                                <span style={{ opacity: 0.75 }}>({(af.size / 1024).toFixed(0)} KB)</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          background: 'transparent',
                          color: 'var(--color-text-primary)',
                          padding: '4px 0',
                        }}
                      >
                        {renderFormattedContent(msg.content)}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: '10.5px', padding: '0 8px', height: '22px' }}
                          >
                            {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedId === msg.id ? 'Copied Response' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {isGenerating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-accent)', fontSize: '12px', padding: '8px 0' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      animation: 'pulse 1s infinite alternate',
                    }}
                  />
                  <span>Sovereign Copilot is generating response via local Ollama...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating Bottom Prompt Dock in Active Chat */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 35%, var(--color-bg) 100%)',
              padding: '20px 20px 24px 20px',
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: '100%', maxWidth: '820px', pointerEvents: 'auto' }}>
              {renderPromptBox(true)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════════ */
  /* CASE 2: EMPTY HOME OVERVIEW SCREEN (INDUSTRIAL CONSOLE & HITL GATEWAY) */
  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', width: '100%', flex: 1 }}>
      {/* Left History Sidebar */}
      {renderHistorySidebar()}

      <div className="home-container" style={{ flex: 1 }}>
        {/* ── 1. WORKSTATION IDENTIFICATION & TELEMETRY STRIP ── */}
        <div className="home-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="home-badge">
              <Shield size={12} color="var(--color-accent)" />
              <span>Air-Gapped Engineering Workstation · v0.1.0</span>
            </div>

            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: '11px', height: '24px', padding: '0 8px', gap: '4px' }}
                title="View previous session history"
              >
                <History size={12} />
                <span>History ({sessions.length})</span>
              </button>
            )}
          </div>

          <h1 className="home-title">
            Sovereign AI Workbench
          </h1>

          <p className="home-subtitle">
            On-premise workstation for industrial document compliance, sandboxed Python AST execution,
            and tamper-evident SHA-256 provenance logging. Powered by local open-weight SLMs with zero cloud telemetry.
          </p>
        </div>

        {/* ── 2. CENTRAL PROMPT DOCK WITH IN-BOX MODEL SELECTOR & ATTACHMENTS ── */}
        <div
          style={{
            width: '100%',
            maxWidth: '820px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            marginTop: '8px',
          }}
        >
          {renderPromptBox(false)}
        </div>
      </div>
    </div>
  )
}
