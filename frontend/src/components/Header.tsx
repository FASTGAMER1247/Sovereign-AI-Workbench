import { Shield } from 'lucide-react'

export function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <Shield size={16} color="var(--color-sovereign)" />
        <span className="header-logo">Sovereign AI Workbench</span>
      </div>

      <div className="header-right">
        <span className="header-version">v0.1.0 · Phase 0</span>
        <div className="sovereign-badge">
          <span className="pulse-dot" />
          LOCAL MODE
        </div>
      </div>
    </header>
  )
}
