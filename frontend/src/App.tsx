import { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { UnifiedStudio } from './components/UnifiedStudio'
import { Particles } from './components/ui/Particles'
import { DotGrid } from './components/ui/DotGrid'
import { SchematicGrid } from './components/ui/SchematicGrid'
import { CommandMenu } from './components/ui/CommandMenu'
import { SettingsModal } from './components/SettingsModal'
import { CopilotDrawer } from './components/CopilotDrawer'
import { FirstRunCheckModal } from './components/FirstRunCheckModal'
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
  const [isFirstRunOpen, setIsFirstRunOpen] = useState<boolean>(false)
  const [backgroundStyle, setBackgroundStyle] = useState<'schematic' | 'particles' | 'dotgrid'>(() => {
    try {
      const saved = localStorage.getItem('sovereign_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.bgStyle === 'dotgrid' || parsed.bgStyle === 'particles' || parsed.bgStyle === 'schematic') {
          return parsed.bgStyle
        }
      }
    } catch {
      // fallback
    }
    return 'schematic'
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
      {/* Static CAD Schematic Grid (Industrial Workstation) — selectable in Settings */}
      {workflowMode === 'home' && backgroundStyle === 'schematic' && (
        <SchematicGrid />
      )}
      {workflowMode === 'home' && backgroundStyle === 'particles' && (
        <Particles
          particleCount={50}
          speed={0.15}
          connectDistance={90}
          particleColor="#F59E0B"
          secondaryColor="#60A5FA"
          lineOpacity={0.08}
          mouseRadius={100}
          minSize={1}
          maxSize={2}
        />
      )}
      {workflowMode === 'home' && backgroundStyle === 'dotgrid' && (
        <DotGrid
          dotSpacing={28}
          baseRadius={1}
          maxRadius={2}
          glowRadius={120}
          baseColor="rgba(255, 255, 255, 0.05)"
          activeColor="#F59E0B"
          secondaryColor="#60A5FA"
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
        onOpenFirstRun={() => setIsFirstRunOpen(true)}
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

      <footer className="workstation-footer">
        <div className="workstation-footer-inner">
          <span
            className="workstation-footer-dot"
            style={{
              background: systemState?.backendStatus === 'online' ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          />
          <span>Binding: 127.0.0.1:8000</span>
        </div>
      </footer>

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
        onOpenFirstRun={() => setIsFirstRunOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        backgroundStyle={backgroundStyle}
        onBackgroundChange={setBackgroundStyle}
        systemState={systemState}
        onRefreshStatus={checkHealth}
        onOpenFirstRun={() => setIsFirstRunOpen(true)}
      />

      {/* Side-panel Copilot Drawer for non-home pages */}
      <CopilotDrawer
        isOpen={isCopilotDrawerOpen && workflowMode !== 'home'}
        onClose={() => setIsCopilotDrawerOpen(false)}
        systemState={systemState}
        initialPrompt={copilotInitialPrompt}
      />

      {/* First-Time Setup & Diagnostics Modal */}
      <FirstRunCheckModal
        isOpen={isFirstRunOpen}
        onClose={() => setIsFirstRunOpen(false)}
        onComplete={() => {
          checkHealth()
        }}
      />
    </div>
  )
}


export default App
