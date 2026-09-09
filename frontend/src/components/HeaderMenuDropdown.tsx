import React, { useEffect, useRef } from 'react'
import {
  Settings,
  Cpu,
  Zap,
  RefreshCw,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'
import type { AppSystemState } from '../types'

export interface HeaderMenuDropdownProps {
  isOpen: boolean
  onClose: () => void
  systemState?: AppSystemState
  workflowMode?: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'
  onSelectWorkflowMode?: (mode: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => void
  onOpenSettings?: () => void
  onOpenFirstRun?: () => void
  onRefreshStatus?: () => void
  isRefreshing?: boolean
  onTriggerDemo?: () => void
  isSeedingDemo?: boolean
  onOpenCopilot?: () => void
}

export const HeaderMenuDropdown: React.FC<HeaderMenuDropdownProps> = ({
  isOpen,
  onClose,
  systemState,
  onOpenSettings,
  onOpenFirstRun,
  onRefreshStatus,
  isRefreshing = false,
  onTriggerDemo,
  isSeedingDemo = false,
  onOpenCopilot,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const backendOnline = systemState?.backendStatus === 'online'
  const modelOnline = systemState?.modelStatus === 'online'
  const activeModel =
    systemState?.modelHealth?.default_model || (backendOnline ? 'qwen2.5-coder:1.5b' : 'OFFLINE')
  const sovereignty = systemState?.sovereigntyStatus
  const isAirGapped = sovereignty?.is_air_gapped ?? false
  const allOnline = backendOnline && modelOnline

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 12,
        width: 330,
        backgroundColor: '#090c12',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 12,
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(16, 185, 129, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9990,
        overflow: 'hidden',
        animation: 'fadeIn 0.18s ease-out',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Status Header */}
      <div
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: allOnline ? '#10B981' : '#EF4444',
                boxShadow: allOnline ? '0 0 8px #10B981' : '0 0 8px #EF4444',
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: -0.2 }}>
              {allOnline ? 'System Online' : 'System Degraded'}
            </span>
            <span
              style={{
                fontSize: 10,
                color: isAirGapped ? '#10B981' : 'var(--color-text-muted)',
                backgroundColor: isAirGapped ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              {isAirGapped ? 'Air-Gapped' : 'Standard'}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#38BDF8',
              fontFamily: 'monospace',
              marginTop: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Model: {activeModel}</span>
          </div>
        </div>


      </div>

      {/* Menu Body */}
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '75vh', overflowY: 'auto' }}>
        {/* SECTION: CONFIGURATION & DIAGNOSTICS */}
        <div style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: 0.8 }}>
          Setup & Configuration
        </div>

        {/* First-Time Setup & Hardware Optimizer */}
        {onOpenFirstRun && (
          <button
            onClick={() => {
              onClose()
              onOpenFirstRun()
            }}
            className="header-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 10px',
              borderRadius: 8,
              border: '1px solid rgba(16, 185, 129, 0.15)',
              backgroundColor: 'rgba(16, 185, 129, 0.04)',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                }}
              >
                <Cpu size={14} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                  Hardware & Model Optimizer
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  Diagnostics, RAM/GPU specs & models
                </div>
              </div>
            </div>
            <ChevronRight size={13} color="var(--color-text-muted)" />
          </button>
        )}

        {/* Workbench Settings */}
        {onOpenSettings && (
          <button
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
            className="header-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 10px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38BDF8',
                }}
              >
                <Settings size={14} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                  Workbench Settings
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}>
                  Appearance, Ollama endpoint, security
                </div>
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px 5px', borderRadius: 4 }}>
              Ctrl+,
            </span>
          </button>
        )}

        {/* SECTION: QUICK TOOLS */}
        <div style={{ padding: '8px 8px 4px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: 0.8, borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: 4 }}>
          Quick Actions
        </div>

        {/* Refresh Status */}
        {onRefreshStatus && (
          <button
            onClick={() => {
              onRefreshStatus()
            }}
            disabled={isRefreshing}
            className="header-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <RefreshCw size={14} color="#94A3B8" className={isRefreshing ? 'spin' : ''} />
            <span style={{ fontSize: 12 }}>
              {isRefreshing ? 'Refreshing Telemetry...' : 'Refresh System Health'}
            </span>
          </button>
        )}

        {/* One-Click Quick Demo */}
        {onTriggerDemo && (
          <button
            onClick={() => {
              onClose()
              onTriggerDemo()
            }}
            disabled={isSeedingDemo}
            className="header-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <Zap size={14} color="#F59E0B" />
            <span style={{ fontSize: 12 }}>
              {isSeedingDemo ? 'Seeding Demo Data...' : 'Run Quick Industrial Demo'}
            </span>
          </button>
        )}

        {/* Sovereign Copilot */}
        {onOpenCopilot && (
          <button
            onClick={() => {
              onClose()
              onOpenCopilot()
            }}
            className="header-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <MessageSquare size={14} color="#10B981" />
            <span style={{ fontSize: 12 }}>Focus Sovereign Copilot</span>
          </button>
        )}

      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: 'var(--color-text-muted)',
        }}
      >
        <span>Press <kbd style={{ padding: '1px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>Ctrl+K</kbd> for commands</span>
        <span style={{ color: '#10B981', fontWeight: 600 }}>v0.1.0</span>
      </div>
    </div>
  )
}
