import { useState } from 'react'
import { Header } from './components/Header'
import { SystemStatus } from './components/SystemStatus'
import { UnifiedStudio } from './components/UnifiedStudio'
import type { AppSystemState } from './types'

const INITIAL_SYSTEM_STATE: AppSystemState = {
  backendStatus: 'idle',
  modelStatus: 'idle',
  modelHealth: null,
  errorMessage: null,
}

function App() {
  const [systemState, setSystemState] = useState<AppSystemState>(INITIAL_SYSTEM_STATE)

  return (
    <div className="app-layout">
      <Header />

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Sovereign AI Workbench</h1>
          <p className="page-subtitle">
            Air-gapped industrial AI control room. All inference, retrieval, workflow execution, and document compilation operate 100% on-premise.
          </p>
        </div>

        {/* Live System Status */}
        <SystemStatus onStatusChange={setSystemState} />

        <div className="divider" />

        {/* Unified Command Center */}
        <UnifiedStudio systemState={systemState} />
      </main>
    </div>
  )
}

export default App
