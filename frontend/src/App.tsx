import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { SystemStatus } from './components/SystemStatus'
import { PromptBox } from './components/PromptBox'
import { ResponseViewer } from './components/ResponseViewer'
import { DocumentWorkspace } from './components/DocumentWorkspace'
import { KnowledgeWorkspace } from './components/KnowledgeWorkspace'
import { sendChat } from './api/client'
import { MessageSquare, FileText, Database } from 'lucide-react'
import type { AppSystemState, ChatResponse } from './types'

const INITIAL_SYSTEM_STATE: AppSystemState = {
  backendStatus: 'idle',
  modelStatus: 'idle',
  modelHealth: null,
  errorMessage: null,
}

type WorkbenchTab = 'documents' | 'knowledge' | 'chat'

function App() {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('documents')
  const [systemState, setSystemState] = useState<AppSystemState>(INITIAL_SYSTEM_STATE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [response, setResponse] = useState<ChatResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastPrompt, setLastPrompt] = useState<string | null>(null)

  const handleSubmit = useCallback(async (prompt: string) => {
    setIsGenerating(true)
    setResponse(null)
    setError(null)
    setLastPrompt(prompt)

    try {
      const result = await sendChat({
        prompt,
        model: systemState.modelHealth?.default_model,
        temperature: 0.7,
      })
      setResponse(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Generation failed — check that backend and Ollama are running.'
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }, [systemState.modelHealth?.default_model])

  const handleCancel = useCallback(() => {
    setIsGenerating(false)
    setError('Request cancelled by user.')
  }, [])

  return (
    <div className="app-layout">
      <Header />

      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title">Sovereign AI Workbench</h1>
            <p className="page-subtitle">
              On-premise multimodal intelligence & agentic workflows. All inference runs locally via Ollama.
            </p>
          </div>

          {/* Workbench Mode Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              gap: '4px',
            }}
          >
            <button
              onClick={() => setActiveTab('documents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'documents' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'documents' ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <FileText size={13} />
              Document Intelligence
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'knowledge' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'knowledge' ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Database size={13} />
              Knowledge Base (RAG)
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'chat' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'chat' ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <MessageSquare size={13} />
              Direct AI Chat
            </button>
          </div>
        </div>

        {/* System status */}
        <SystemStatus onStatusChange={setSystemState} />

        <div className="divider" />

        {/* Active Tab View */}
        {activeTab === 'documents' ? (
          <DocumentWorkspace systemState={systemState} />
        ) : activeTab === 'knowledge' ? (
          <KnowledgeWorkspace systemState={systemState} />
        ) : (
          <>
            {/* Prompt input */}
            <PromptBox
              onSubmit={handleSubmit}
              isGenerating={isGenerating}
              onCancel={handleCancel}
              systemState={systemState}
            />

            {/* Response output */}
            <ResponseViewer
              response={response}
              isGenerating={isGenerating}
              error={error}
              prompt={lastPrompt}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default App

