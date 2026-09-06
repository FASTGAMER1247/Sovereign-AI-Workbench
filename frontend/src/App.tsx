import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { UnifiedStudio } from './components/UnifiedStudio'
import { Particles } from './components/ui/Particles'
import { DotGrid } from './components/ui/DotGrid'
import { CommandMenu } from './components/ui/CommandMenu'
import { SettingsModal } from './components/SettingsModal'
import { CopilotDrawer } from './components/CopilotDrawer'
import { getHealth, getModelHealth, getSovereigntyStatus, seedDemoPackage, setDefaultModel } from './api/client'
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
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState<boolean>(false)
  const [backgroundStyle, setBackgroundStyle] = useState<'particles' | 'dotgrid'>(() => {
    try {
      const saved = localStorage.getItem('sovereign_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.bgStyle === 'dotgrid' || parsed.bgStyle === 'particles') {
          return parsed.bgStyle
        }
      }
    } catch {
      // fallback
    }
    return 'particles'
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)

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
        // Sync saved default model if configured in localStorage
        const savedDefaultModel = localStorage.getItem('sovereign_default_model')
        if (savedDefaultModel && mh && mh.default_model !== savedDefaultModel && mh.available_models?.includes(savedDefaultModel)) {
          setDefaultModel(savedDefaultModel).catch(() => {})
          mh.default_model = savedDefaultModel
        }

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

  // Global shortcut: Ctrl+, (or Cmd+,) toggles Workbench Settings
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const handleWorkflowModeChange = (mode: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => {
    setWorkflowMode(mode)
    if (mode === 'home') {
      setIsCopilotDrawerOpen(false)
    }
  }

  const handleOpenCopilot = () => {
    if (workflowMode === 'home') {
      const homeChatInput = document.querySelector('.home-chat-input, textarea') as HTMLElement | null
      if (homeChatInput) {
        homeChatInput.focus()
      }
    } else {
      setIsCopilotDrawerOpen((prev) => !prev)
    }
  }

  const handleOpenCopilotWithPrompt = (prompt: string) => {
    setCopilotInitialPrompt(prompt)
    if (workflowMode === 'home') {
      const homeChatInput = document.querySelector('.home-chat-input, textarea') as HTMLElement | null
      if (homeChatInput) {
        homeChatInput.focus()
      }
    } else {
      setIsCopilotDrawerOpen(true)
    }
  }

  return (
    <div className="app-layout">
      {/* Dynamic ambient background — selectable in Settings */}
      {workflowMode === 'home' && backgroundStyle === 'particles' && (
        <Particles
          particleCount={65}
          speed={0.25}
          connectDistance={110}
          particleColor="#10B981"
          secondaryColor="#38BDF8"
          lineOpacity={0.12}
          mouseRadius={140}
          minSize={1}
          maxSize={2.5}
        />
      )}
      {workflowMode === 'home' && backgroundStyle === 'dotgrid' && (
        <DotGrid
          dotSpacing={26}
          baseRadius={1.2}
          maxRadius={2.8}
          glowRadius={150}
          baseColor="rgba(255, 255, 255, 0.08)"
          activeColor="#10B981"
          secondaryColor="#38BDF8"
        />
      )}

      <Header
        systemState={systemState}
        onRefreshStatus={checkHealth}
        isRefreshing={isRefreshing}
        workflowMode={workflowMode}
        onSelectWorkflowMode={handleWorkflowModeChange}
        onOpenCopilot={handleOpenCopilot}
        isCopilotOpen={isCopilotDrawerOpen && workflowMode !== 'home'}
        isSeedingDemo={isSeedingDemo}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-content">
        <UnifiedStudio
          systemState={systemState}
          workflowMode={workflowMode}
          onWorkflowModeChange={handleWorkflowModeChange}
          onDemoSeedingStateChange={setIsSeedingDemo}
          onOpenCopilotWithPrompt={handleOpenCopilotWithPrompt}
          copilotInitialPrompt={copilotInitialPrompt}
        />
      </main>

      <CommandMenu
        onSelectWorkflowMode={handleWorkflowModeChange}
        onTriggerDemo={() => {
          setIsSeedingDemo(true)
          seedDemoPackage()
            .then(() => {
              handleWorkflowModeChange('workflow_a')
            })
            .catch(() => {})
            .finally(() => setIsSeedingDemo(false))
        }}
        onRefreshStatus={checkHealth}
        onOpenCopilot={handleOpenCopilot}
        onSearchQuery={(q) => {
          handleOpenCopilotWithPrompt(q)
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        backgroundStyle={backgroundStyle}
        onBackgroundChange={setBackgroundStyle}
        systemState={systemState}
        onRefreshStatus={checkHealth}
      />

      {/* Side-panel Copilot Drawer for non-home pages */}
      <CopilotDrawer
        isOpen={isCopilotDrawerOpen && workflowMode !== 'home'}
        onClose={() => setIsCopilotDrawerOpen(false)}
        systemState={systemState}
        initialPrompt={copilotInitialPrompt}
      />
    </div>
  )
}

export default App
