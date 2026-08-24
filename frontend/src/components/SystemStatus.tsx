import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Server, Cpu } from 'lucide-react'
import { getHealth, getModelHealth } from '../api/client'
import type { AppSystemState } from '../types'

interface SystemStatusProps {
  onStatusChange?: (state: AppSystemState) => void
}

export function SystemStatus({ onStatusChange }: SystemStatusProps) {
  const [state, setState] = useState<AppSystemState>({
    backendStatus: 'idle',
    modelStatus: 'idle',
    modelHealth: null,
    errorMessage: null,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const check = useCallback(async () => {
    setIsRefreshing(true)
    setState(s => ({ ...s, backendStatus: 'checking', modelStatus: 'checking', errorMessage: null }))

    let backendOk = false
    try {
      await getHealth()
      backendOk = true
      setState(s => ({ ...s, backendStatus: 'online' }))
    } catch {
      setState(s => ({ ...s, backendStatus: 'error', modelStatus: 'error', errorMessage: 'Backend unreachable' }))
      setIsRefreshing(false)
      return
    }

    if (backendOk) {
      try {
        const mh = await getModelHealth()
        const modelStatus: AppSystemState['modelStatus'] = mh.status === 'ok' ? 'online' : 'error'
        setState(s => {
          const next: AppSystemState = { ...s, modelStatus, modelHealth: mh, errorMessage: mh.error ?? null }
          onStatusChange?.(next)
          return next
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Model check failed'
        setState(s => {
          const next = { ...s, modelStatus: 'error' as const, errorMessage: msg }
          onStatusChange?.(next)
          return next
        })
      }
    }

    setIsRefreshing(false)
  }, [onStatusChange])

  useEffect(() => {
    check()
  }, [check])

  function dotClass(status: AppSystemState['backendStatus']) {
    if (status === 'online') return 'status-dot online pulse'
    if (status === 'error') return 'status-dot error'
    if (status === 'checking') return 'status-dot warning pulse'
    return 'status-dot idle'
  }

  function valueClass(status: AppSystemState['backendStatus']) {
    if (status === 'online') return 'status-item-value online'
    if (status === 'error') return 'status-item-value error'
    if (status === 'checking') return 'status-item-value warning'
    return 'status-item-value'
  }

  function label(status: AppSystemState['backendStatus']) {
    if (status === 'online') return 'ONLINE'
    if (status === 'error') return 'ERROR'
    if (status === 'checking') return 'CHECKING…'
    return 'IDLE'
  }

  const { backendStatus, modelStatus, modelHealth } = state

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">System Status</span>
        <button
          className="btn btn-ghost"
          onClick={check}
          disabled={isRefreshing}
          title="Refresh status"
          id="btn-refresh-status"
          style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
        >
          <RefreshCw size={12} style={{ animation: isRefreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      <div className="card-body">
        <div className="status-grid">
          <div className="status-item">
            <span className="status-item-label">
              <Server size={10} style={{ display: 'inline', marginRight: 4 }} />
              Backend API
            </span>
            <span className={valueClass(backendStatus)}>
              <span className={dotClass(backendStatus)} />
              {label(backendStatus)}
            </span>
          </div>

          <div className="status-item">
            <span className="status-item-label">
              <Cpu size={10} style={{ display: 'inline', marginRight: 4 }} />
              Ollama
            </span>
            <span className={valueClass(modelStatus)}>
              <span className={dotClass(modelStatus)} />
              {label(modelStatus)}
            </span>
          </div>

          <div className="status-item">
            <span className="status-item-label">Model</span>
            <span className="status-item-value">
              {modelHealth?.default_model ?? '—'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-item-label">Provider</span>
            <span className="status-item-value">
              {modelHealth?.provider ?? '—'}
            </span>
          </div>
        </div>

        {state.errorMessage && (
          <div style={{ marginTop: '12px' }}>
            <span className="response-error" style={{ display: 'block' }}>
              {state.errorMessage}
            </span>
          </div>
        )}

        {modelHealth && modelHealth.available_models.length > 0 && (
          <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Installed: {modelHealth.available_models.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
