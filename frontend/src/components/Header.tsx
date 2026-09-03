import React from 'react'
import {
  Shield,
  Zap,
  MessageSquare,
  RefreshCw,
  Check,
  Code2,
  Home,
  Database,
  FileCheck,
} from 'lucide-react'
import type { AppSystemState } from '../types'

interface HeaderProps {
  systemState?: AppSystemState
  onRefreshStatus?: () => void
  isRefreshing?: boolean
  workflowMode?: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'
  onSelectWorkflowMode?: (mode: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => void
  onOpenCopilot?: () => void
  onTriggerDemo?: () => void
  isSeedingDemo?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  systemState,
  onRefreshStatus,
  isRefreshing = false,
  workflowMode = 'home',
  onSelectWorkflowMode,
  onOpenCopilot,
  onTriggerDemo,
  isSeedingDemo = false,
}) => {
  const backendOnline = systemState?.backendStatus === 'online'
  const modelOnline = systemState?.modelStatus === 'online'
  const activeModel = systemState?.modelHealth?.default_model || (backendOnline ? 'qwen2.5-coder:1.5b' : 'OFFLINE')
  const sovereignty = systemState?.sovereigntyStatus
  const isAirGapped = sovereignty?.is_air_gapped ?? false
  const allOnline = backendOnline && modelOnline

  return (
    <header className="header">
      {/* ── LEFT: Brand Identity (Clicking returns to Home) ── */}
      <div
        className="header-left"
        onClick={() => onSelectWorkflowMode?.('home')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Return to Home Overview"
      >
        <div className="header-brand-title">
          <Shield size={16} color="var(--color-accent)" />
          <span>Sovereign AI Workbench</span>
        </div>
        <span className="header-version-pill">v0.1.0</span>
      </div>

      {/* ── CENTER: Segmented Mode Switcher (Home + 3 Core Workspaces) ── */}
      {onSelectWorkflowMode && (
        <div className="header-center-modes">
          <button
            onClick={() => onSelectWorkflowMode('home')}
            className={`header-mode-tab ${workflowMode === 'home' ? 'active' : ''}`}
            title="Home Overview: Workspace launcher & on-page chat"
          >
            <Home size={12} />
            <span>Home</span>
          </button>

          <button
            onClick={() => onSelectWorkflowMode('workflow_a')}
            className={`header-mode-tab ${workflowMode === 'workflow_a' ? 'active' : ''}`}
            title="Document Inspector: Upload inspection reports or scans to automatically check safety rules and generate certificates"
          >
            <FileCheck size={12} />
            <span>Document Inspector</span>
          </button>

          <button
            onClick={() => onSelectWorkflowMode('workflow_b')}
            className={`header-mode-tab ${workflowMode === 'workflow_b' ? 'active' : ''}`}
            title="Workflow B: Autonomous Code Synthesis, AST Guard, and Isolated Sandbox"
          >
            <Code2 size={12} />
            <span>Coding Agent</span>
          </button>

          <button
            onClick={() => onSelectWorkflowMode('knowledge')}
            className={`header-mode-tab ${workflowMode === 'knowledge' ? 'active' : ''}`}
            title="Knowledge Base: Organizational Standards, SOP-REF-570, and ChromaDB Vector Search"
          >
            <Database size={12} />
            <span>Knowledge Base</span>
          </button>
        </div>
      )}

      {/* ── RIGHT: Compact Status Indicators ── */}
      <div className="header-right">
        {/* Combined System Health */}
        <div
          className="header-telemetry-item"
          title={allOnline ? `System Online · Model: ${activeModel}` : 'System Degraded'}
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

        {/* AI Copilot Focus Trigger */}
        <button
          onClick={() => {
            if (onSelectWorkflowMode) onSelectWorkflowMode('home')
            if (onOpenCopilot) onOpenCopilot()
          }}
          className="btn btn-sm btn-ghost"
          title="Focus Sovereign AI Copilot Chat on Home Screen"
        >
          <MessageSquare size={11} />
          <span>Copilot</span>
        </button>
      </div>
    </header>
  )
}
