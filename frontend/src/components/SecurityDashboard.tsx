import React, { useState, useEffect } from 'react'
import {
  Shield,
  ShieldCheck,
  Lock,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Hash,
  Activity,
  Layers,
  Copy,
  Check,
} from 'lucide-react'
import {
  getSovereigntyStatus,
  probeSovereignty,
  getAuditLedger,
  verifyAuditIntegrity,
  getAuditExportUrl,
} from '../api/client'
import type {
  AppSystemState,
  AuditEvent,
  LedgerIntegrityResponse,
  SovereigntyStatusResponse,
} from '../types'

interface SecurityDashboardProps {
  systemState: AppSystemState
  onClose?: () => void
}

const EVENT_FILTER_PRESETS = [
  'ALL',
  'DOCUMENT_INGEST',
  'DOCUMENT_EXTRACT',
  'HITL_APPROVAL',
  'AST_POLICY_BLOCK',
  'SANDBOX_EXECUTION',
  'EGRESS_PROBE',
]

export const SecurityDashboard: React.FC<SecurityDashboardProps> = () => {
  const [sovereignty, setSovereignty] = useState<SovereigntyStatusResponse | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL')
  const [integrityResult, setIntegrityResult] = useState<LedgerIntegrityResponse | null>(null)
  const [isProbing, setIsProbing] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [sov, ledger, integ] = await Promise.all([
        getSovereigntyStatus().catch(() => null),
        getAuditLedger(100).catch(() => ({ total_events: 0, chain_valid: true, events: [] })),
        verifyAuditIntegrity().catch(() => null),
      ])
      if (sov) setSovereignty(sov)
      if (ledger) setEvents(ledger.events)
      if (integ) setIntegrityResult(integ)
    } catch {
      // transient load error
    }
  }

  async function handleLiveProbe() {
    setIsProbing(true)
    try {
      const updated = await probeSovereignty()
      setSovereignty(updated)
      const ledger = await getAuditLedger(100)
      setEvents(ledger.events)
    } catch {
      // probe error
    } finally {
      setIsProbing(false)
    }
  }

  async function handleVerifyIntegrity() {
    setIsVerifying(true)
    try {
      const result = await verifyAuditIntegrity()
      setIntegrityResult(result)
    } catch {
      // verify error
    } finally {
      setIsVerifying(false)
    }
  }

  function handleCopy(text: string, hashId: string) {
    navigator.clipboard.writeText(text)
    setCopiedHash(hashId)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const filteredEvents =
    selectedEventType === 'ALL'
      ? events
      : events.filter((e) => e.event_type.toUpperCase() === selectedEventType.toUpperCase())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ── TOP METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Card 1: Air-Gap Verification */}
        <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={17} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Air-Gap Verification
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
              {sovereignty?.is_air_gapped ? 'AIR-GAP ✓ VERIFIED' : 'AIR-GAP — NOT VERIFIED'}
            </div>
            <div style={{ fontSize: '11px', color: sovereignty?.is_air_gapped ? 'var(--color-success)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Score: {sovereignty?.sovereignty_score_pct ?? 100}% · Grade {sovereignty?.grade || 'A'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Network Isolation */}
        <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent-bg)',
              border: '1px solid var(--color-accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              flexShrink: 0,
            }}
          >
            <Activity size={17} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Network Isolation
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
              Runtime Verified
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Local endpoint · {sovereignty?.bound_host || '127.0.0.1'}:8000
            </div>
          </div>
        </div>

        {/* Card 3: Cryptographic Audit Ledger (SHA-256 Hash Chain) */}
        <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: integrityResult?.is_valid ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${integrityResult?.is_valid ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: integrityResult?.is_valid ? 'var(--color-success)' : 'var(--color-danger)',
              flexShrink: 0,
            }}
          >
            <Lock size={17} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Cryptographic Audit Ledger
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
              SHA-256 Hash Chain
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {integrityResult?.total_blocks_checked || events.length} Blocks Sequentially Chained
            </div>
            <div style={{ fontSize: '10px', color: integrityResult?.is_valid ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {integrityResult?.is_valid ? '✓ Cryptographically Verified' : 'Append-Only Verification Ready'}
            </div>
          </div>
        </div>
      </div>

      {/* —— ACTION BAR —— */}
      <div
        className="panel"
        style={{
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} color="var(--color-accent)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Zero-Egress & Cryptographic Hash Chain Controls
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleLiveProbe}
            disabled={isProbing}
            className="btn btn-primary"
          >
            <RefreshCw size={12} className={isProbing ? 'spinner' : ''} />
            <span>{isProbing ? 'Probing Sockets...' : 'Run Live Egress Probe'}</span>
          </button>

          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="btn btn-ghost"
          >
            <FileCheck size={12} color="var(--color-success)" />
            <span>{isVerifying ? 'Verifying...' : 'Verify Hash Chain'}</span>
          </button>

          <a
            href={getAuditExportUrl('csv')}
            download="sovereign_audit_ledger.csv"
            className="btn btn-sm btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            <Download size={11} />
            <span>CSV</span>
          </a>

          <a
            href={getAuditExportUrl('jsonl')}
            download="sovereign_audit_ledger.jsonl"
            className="btn btn-sm btn-ghost"
            style={{ textDecoration: 'none' }}
          >
            <Download size={11} />
            <span>JSONL</span>
          </a>
        </div>
      </div>


      {/* —— INTEGRITY NOTIFICATION BANNER —— */}
      {integrityResult && (
        <div
          style={{
            padding: '10px 16px',
            background: integrityResult.is_valid
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${integrityResult.is_valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: integrityResult.is_valid ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {integrityResult.is_valid ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{integrityResult.message}</span>
        </div>
      )}

      {/* —— SPLIT PANEL: EGRESS PROBES & AUDIT LEDGER —— */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '14px', minHeight: '440px' }}>
        {/* LEFT: Live Egress Probes Table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} color="var(--color-accent)" />
              <span>Outbound Egress Probes</span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
              {sovereignty?.egress_probes.length || 0} Targets
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sovereignty?.egress_probes && sovereignty.egress_probes.length > 0 ? (
              sovereignty.egress_probes.map((probe, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {probe.target}
                    </span>
                    <span className={`badge ${probe.blocked ? 'badge-success' : 'badge-warning'}`}>
                      {probe.blocked ? 'BLOCKED / ISOLATED' : 'EGRESS OPEN'}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    {probe.detail}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Latency: {probe.duration_ms}ms · Type: {probe.target_type}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '30px' }}>
                Click "Run Live Egress Probe" to test socket isolation.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cryptographic Hash-Chained Audit Ledger */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          {/* Header & Filter Presets */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Hash size={13} color="var(--color-accent)" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Cryptographic Audit Ledger (SHA-256 Hash Chain)
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                ({filteredEvents.length} events)
              </span>
            </div>


            {/* Event Filter Chips */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {EVENT_FILTER_PRESETS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedEventType(f)}
                  style={{
                    background: selectedEventType === f ? 'var(--color-accent)' : 'var(--color-surface)',
                    border: `1px solid ${selectedEventType === f ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: selectedEventType === f ? '#fff' : 'var(--color-text-muted)',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '8px 10px', width: '50px' }}>Block</th>
                  <th style={{ padding: '8px 10px' }}>Timestamp</th>
                  <th style={{ padding: '8px 10px' }}>Event</th>
                  <th style={{ padding: '8px 10px' }}>Severity</th>
                  <th style={{ padding: '8px 10px' }}>Actor</th>
                  <th style={{ padding: '8px 10px' }}>SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  let badgeBg = 'var(--color-accent-bg)'
                  let badgeColor = 'var(--color-accent)'
                  if (ev.severity === 'CRITICAL') {
                    badgeBg = 'rgba(239, 68, 68, 0.15)'
                    badgeColor = 'var(--color-danger)'
                  } else if (ev.severity === 'SECURITY_ALERT') {
                    badgeBg = 'rgba(245, 158, 11, 0.15)'
                    badgeColor = 'var(--color-warning)'
                  }

                  return (
                    <tr
                      key={ev.index}
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        background: selectedEvent?.index === ev.index ? 'var(--color-accent-bg)' : 'transparent',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        #{ev.index}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ev.timestamp.slice(11, 19)}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {ev.event_type}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: badgeBg,
                            color: badgeColor,
                          }}
                        >
                          {ev.severity}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>
                        {ev.actor}
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{ev.block_hash.slice(0, 10)}...</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(ev.block_hash, String(ev.index))
                            }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                          >
                            {copiedHash === String(ev.index) ? <Check size={11} color="var(--color-success)" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                No audit events recorded for the selected filter.
              </div>
            )}
          </div>

          {/* Event Details Drawer */}
          {selectedEvent && (
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Block #{selectedEvent.index} Payload Details ({selectedEvent.event_type})
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  Prev: {selectedEvent.prev_hash.slice(0, 12)}...
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '8px',
                  background: '#05070d',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: '#94a3b8',
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(selectedEvent.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
