import React, { useState } from 'react'
import {
  Shield,
  Zap,
  MessageSquare,
  RefreshCw,
  Check,
  Settings,
  Menu,
} from 'lucide-react'
import { DockTabs } from './ui/DockTabs'
import { HeaderMenuDropdown } from './HeaderMenuDropdown'
import type { AppSystemState } from '../types'

interface HeaderProps {
  systemState?: AppSystemState
  onRefreshStatus?: () => void
  isRefreshing?: boolean
  workflowMode?: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'
  onSelectWorkflowMode?: (mode: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => void
  onOpenCopilot?: () => void
  isCopilotOpen?: boolean
  onTriggerDemo?: () => void
  isSeedingDemo?: boolean
  onOpenSettings?: () => void
  onOpenFirstRun?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  systemState,
  onRefreshStatus,
  isRefreshing = false,
  workflowMode = 'home',
  onSelectWorkflowMode,
  onOpenCopilot,
  isCopilotOpen = false,
  onTriggerDemo,
  isSeedingDemo = false,
  onOpenSettings,
  onOpenFirstRun,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)

  const backendOnline = systemState?.backendStatus === 'online'
  const modelOnline = systemState?.modelStatus === 'online'
  const activeModel = systemState?.modelHealth?.default_model || (backendOnline ? 'qwen2.5-coder:1.5b' : 'OFFLINE')
  const sovereignty = systemState?.sovereigntyStatus
  const isAirGapped = sovereignty?.is_air_gapped ?? false
  const allOnline = backendOnline && modelOnline

  return (
    <header className="header" style={{ position: 'relative' }}>
      {/* ── LEFT: Brand Identity (Clicking returns to Home) ── */}
      <div
        className="header-left"
        onClick={() => onSelectWorkflowMode?.('home')}
        style={{ cursor: 'pointer', userSelect: 'none', zIndex: 2 }}
        title="Return to Home Overview"
      >
        <div className="header-brand-title">
          <Shield size={16} color="var(--color-accent)" />
          <span>Sovereign AI Workbench</span>
        </div>
        <span className="header-version-pill">v0.1.0</span>
      </div>

      {/* ── CENTER: Dock Tabs with StarBorder & Specular Highlights (Centered on the line) ── */}
      {onSelectWorkflowMode && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            pointerEvents: 'auto',
          }}
        >
          <DockTabs
            activeTab={workflowMode}
            onTabChange={onSelectWorkflowMode}
          />
        </div>
      )}

      {/* ── RIGHT: Compact Status Indicators ── */}
      <div className="header-right" style={{ marginLeft: 'auto', zIndex: 2 }}>
        {/* Combined System Health */}
        <div
          className="header-telemetry-item"
          onClick={() => onOpenFirstRun?.()}
          style={{ cursor: onOpenFirstRun ? 'pointer' : 'default' }}
          title={allOnline ? `System Online · Model: ${activeModel} — Click to run System Setup & Diagnostics` : 'System Degraded — Click to inspect issues'}
        >
          <span className={`header-telemetry-dot ${allOnline ? 'online' : 'error'}`} />
          <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeModel}
          </span>
        </div>


        {/* Air-Gap Verification Status (Clickable to open Security Dashboard) */}
        <div
          className="header-telemetry-item"
          onClick={() => onSelectWorkflowMode?.('security')}
          style={{
            cursor: 'pointer',
            color: isAirGapped ? 'var(--color-success)' : 'var(--color-text-muted)',
            borderColor: workflowMode === 'security' ? 'var(--color-accent)' : isAirGapped ? 'var(--color-success-border)' : 'var(--color-border)',
            background: workflowMode === 'security' ? 'var(--color-accent-bg)' : isAirGapped ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
            transition: 'all var(--transition-fast)',
          }}
          title={
            sovereignty
              ? `Runtime Verified Zero-Egress (Score: ${sovereignty.sovereignty_score_pct}% · ${sovereignty.grade}) — Click to open Security Center`
              : 'Click to open Security & Cryptographic Audit Ledger'
          }
        >
          {isAirGapped ? (
            <>
              <Check size={11} />
              <span>Air-Gap ✓</span>
            </>
          ) : (
            <span>Air-Gap —</span>
          )}
        </div>

        {/* Refresh System Health */}
        {onRefreshStatus && (
          <button
            onClick={onRefreshStatus}
            disabled={isRefreshing}
            className="btn btn-sm btn-ghost"
            title="Refresh System Health & Model Telemetry"
            style={{ width: '26px', padding: 0 }}
          >
            <RefreshCw
              size={12}
              style={{ animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none' }}
            />
          </button>
        )}

        {/* Workbench Settings Modal Trigger */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="btn btn-sm btn-ghost"
            title="Workbench Settings (Ctrl+,)"
            style={{ width: '26px', padding: 0 }}
          >
            <Settings size={13} />
          </button>
        )}

        {/* Quick Demo Shortcut */}
        {onTriggerDemo && (
          <button
            onClick={onTriggerDemo}
            disabled={isSeedingDemo}
            className="btn btn-sm btn-ghost"
            title="Load synthetic Refinery Line 102 inspection report & SOP-REF-570 for rapid 1-click evaluation"
          >
            <Zap size={11} />
            <span>{isSeedingDemo ? 'Seeding...' : 'Quick Demo'}</span>
          </button>
        )}

        {/* AI Copilot Trigger */}
        <button
          onClick={() => {
            if (onOpenCopilot) {
              onOpenCopilot()
            } else if (onSelectWorkflowMode) {
              onSelectWorkflowMode('home')
            }
          }}
          className={`btn btn-sm btn-ghost ${isCopilotOpen ? 'active' : ''}`}
          style={isCopilotOpen ? {
            color: 'var(--color-accent)',
            background: 'var(--color-accent-bg)',
            borderColor: 'var(--color-accent)',
          } : undefined}
          title={workflowMode === 'home' ? 'Focus Sovereign Copilot Chat' : 'Toggle Sovereign Copilot Side Panel'}
        >
          <MessageSquare size={11} />
          <span>Copilot</span>
        </button>

        {/* ── TOP RIGHT HAMBURGER MENU ── */}
        <button
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`btn btn-sm btn-ghost ${isMenuOpen ? 'active' : ''}`}
          title="Workbench Menu, Setup & Tools"
          style={{
            width: '30px',
            height: '28px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isMenuOpen ? '#10B981' : 'var(--color-text-main)',
            backgroundColor: isMenuOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            borderColor: isMenuOpen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Menu size={15} />
        </button>

        {/* Dropdown Menu Panel */}
        <HeaderMenuDropdown
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          systemState={systemState}
          workflowMode={workflowMode}
          onSelectWorkflowMode={onSelectWorkflowMode}
          onOpenSettings={onOpenSettings}
          onOpenFirstRun={onOpenFirstRun}
          onRefreshStatus={onRefreshStatus}
          isRefreshing={isRefreshing}
          onTriggerDemo={onTriggerDemo}
          isSeedingDemo={isSeedingDemo}
          onOpenCopilot={onOpenCopilot}
        />
      </div>
    </header>
  )
}
