import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { UnifiedStudio } from './components/UnifiedStudio'
import { getHealth, getModelHealth, getSovereigntyStatus } from './api/client'
import type { AppSystemState } from './types'

const INITIAL_SYSTEM_STATE: AppSystemState = {
  backendStatus: 'idle',
  modelStatus: 'idle',
  modelHealth: null,
  sovereigntyStatus: null,
  errorMessage: null,
}

function App() {
  const [systemState, setSystemState] = useState<AppSystemState>(INITIAL_SYSTEM_STATE)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [workflowMode, setWorkflowMode] = useState<'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'>('home')
  const [isSeedingDemo, setIsSeedingDemo] = useState<boolean>(false)
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string>('')

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true)
    let backendOk = false
    try {
      await getHealth()
      backendOk = true
      setSystemState((s) => ({ ...s, backendStatus: 'online', errorMessage: null }))
    } catch {
      setSystemState((s) => ({
        ...s,
        backendStatus: 'error',
        modelStatus: 'error',
        errorMessage: 'Backend unreachable at 127.0.0.1:8000',
      }))
      setIsRefreshing(false)
      return
    }

    if (backendOk) {
      try {
        const [mh, sov] = await Promise.all([
          getModelHealth().catch(() => null),
          getSovereigntyStatus().catch(() => null),
        ])
        setSystemState((s) => ({
          ...s,
          modelStatus: mh && mh.status === 'ok' ? 'online' : 'error',
          modelHealth: mh,
          sovereigntyStatus: sov,
          errorMessage: mh?.error ?? null,
        }))
      } catch (e: unknown) {
        setSystemState((s) => ({
          ...s,
          modelStatus: 'error',
          errorMessage: e instanceof Error ? e.message : 'Telemetry check failed',
        }))
      }
    }
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  const handleOpenCopilotWithPrompt = (prompt: string) => {
    setCopilotInitialPrompt(prompt)
    setWorkflowMode('home')
  }

  return (
    <div className="app-layout">
      <Header
        systemState={systemState}
        onRefreshStatus={checkHealth}
        isRefreshing={isRefreshing}
        workflowMode={workflowMode}
        onSelectWorkflowMode={setWorkflowMode}
        onOpenCopilot={() => setWorkflowMode('home')}
        isSeedingDemo={isSeedingDemo}
      />

      <main className="main-content">
        <UnifiedStudio
          systemState={systemState}
          workflowMode={workflowMode}
          onWorkflowModeChange={setWorkflowMode}
          onDemoSeedingStateChange={setIsSeedingDemo}
          onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
          copilotInitialPrompt={copilotInitialPrompt}
        />
      </main>
    </div>
  )
}

export default App
