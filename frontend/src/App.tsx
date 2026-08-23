import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { SystemStatus } from './components/SystemStatus'
import { PromptBox } from './components/PromptBox'
import { ResponseViewer } from './components/ResponseViewer'
import { sendChat } from './api/client'
import type { AppSystemState, ChatResponse } from './types'

const INITIAL_SYSTEM_STATE: AppSystemState = {
  backendStatus: 'idle',
  modelStatus: 'idle',
  modelHealth: null,
  errorMessage: null,
}

function App() {
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
    // Cancellation of in-flight request is a future enhancement.
    // For MVP we simply reset the loading state.
    setIsGenerating(false)
    setError('Request cancelled by user.')
  }, [])

  return (
    <div className="app-layout">
      <Header />

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">AI Workbench</h1>
          <p className="page-subtitle">
            Sovereign local AI — all inference runs on your hardware via Ollama.
            Zero external API calls.
          </p>
        </div>

        {/* System status */}
        <SystemStatus onStatusChange={setSystemState} />

        <div className="divider" />

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
      </main>
    </div>
  )
}

export default App
