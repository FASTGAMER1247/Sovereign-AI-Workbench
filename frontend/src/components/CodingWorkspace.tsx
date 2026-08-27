import React, { useState, useEffect, useRef } from 'react'
import {
  Code2,
  Play,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  Download,
  FileCode,
  Terminal,
  Wrench,
  X,
  Check,
  Copy,
  Boxes,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import {
  executeCodingWorkflow,
  getCodingExecution,
  listCodingExecutions,
  cancelCodingExecution,
  getCodingArtifactDownloadUrl,
  getSandboxStatus,
} from '../api/client'
import type {
  AppSystemState,
  CodingWorkflowExecution,
  SandboxStatusResponse,
} from '../types'

interface CodingWorkspaceProps {
  systemState: AppSystemState
  onSwitchToWorkflowA?: () => void
}

const PRESET_CODING_TASKS = [
  {
    title: 'Loan EMI Calculator',
    icon: '💳',
    prompt:
      'Write a Python function to calculate the monthly EMI for a loan (principal, rate, tenure) and create comprehensive unit tests covering edge cases like zero interest, standard loans, and negative input validation.',
  },
  {
    title: 'Industrial Sensor Parser',
    icon: '⚙️',
    prompt:
      'Write a Python class to parse and validate industrial sensor telemetry packets (temperature, pressure, vibration). Include unit tests checking for out-of-range sensor alerts and corrupted payload handling.',
  },
  {
    title: 'Darcy-Weisbach Pressure Drop',
    icon: '🧪',
    prompt:
      'Write a Python module to compute fluid friction factor and pressure drop across piping using the Darcy-Weisbach equation. Include unit tests for laminar vs turbulent flow regimes.',
  },
  {
    title: 'Industrial Data Sanitizer',
    icon: '🛡️',
    prompt:
      'Write a Python function to sanitize and redact PII and confidential equipment serial numbers from plant incident logs. Include unit tests verifying that sensitive patterns are scrubbed.',
  },
]

export const CodingWorkspace: React.FC<CodingWorkspaceProps> = ({
  systemState,
  onSwitchToWorkflowA,
}) => {
  const [prompt, setPrompt] = useState<string>(PRESET_CODING_TASKS[0].prompt)
  const [maxRepairs, setMaxRepairs] = useState<number>(3)
  const [activeExecution, setActiveExecution] = useState<CodingWorkflowExecution | null>(null)
  const [recentExecutions, setRecentExecutions] = useState<CodingWorkflowExecution[]>([])
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatusResponse | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'code' | 'tests' | 'terminal' | 'repairs'>('code')
  const [copied, setCopied] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const pollingRef = useRef<number | null>(null)

  // Load sandbox status & executions
  useEffect(() => {
    loadInitialData()
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  async function loadInitialData() {
    try {
      const [sbStatus, execs] = await Promise.all([
        getSandboxStatus().catch(() => null),
        listCodingExecutions().catch(() => []),
      ])
      if (sbStatus) setSandboxStatus(sbStatus)
      if (execs.length > 0) {
        setRecentExecutions(execs)
        if (!activeExecution) {
          setActiveExecution(execs[0])
        }
      }
    } catch {
      // Ignore initial load error
    }
  }

  // Polling for in-flight execution
  useEffect(() => {
    if (activeExecution && activeExecution.status === 'running') {
      setIsRunning(true)
      const interval = window.setInterval(async () => {
        try {
          const updated = await getCodingExecution(activeExecution.id)
          setActiveExecution(updated)
          if (updated.status !== 'running') {
            setIsRunning(false)
            loadInitialData()
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500)
      return () => clearInterval(interval)
    } else {
      setIsRunning(false)
    }
  }, [activeExecution?.id, activeExecution?.status])

  async function handleLaunchWorkflow() {
    if (!prompt.trim() || isRunning) return
    setErrorMsg(null)
    setIsRunning(true)

    try {
      const exec = await executeCodingWorkflow({
        prompt: prompt.trim(),
        max_repairs: maxRepairs,
      })
      setActiveExecution(exec)
      setActiveTab('code')
      setRecentExecutions((prev) => [exec, ...prev.filter((e) => e.id !== exec.id)])
    } catch (err: unknown) {
      setIsRunning(false)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch coding workflow.')
    }
  }

  async function handleCancel() {
    if (!activeExecution || !isRunning) return
    try {
      const updated = await cancelCodingExecution(activeExecution.id)
      setActiveExecution(updated)
      setIsRunning(false)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cancel execution.')
    }
  }

  function handleReset() {
    setActiveExecution(null)
    setErrorMsg(null)
    setPrompt(PRESET_CODING_TASKS[0].prompt)
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canvasSteps = [
    {
      id: 'step_1_spec',
      icon: <FileCode size={16} />,
      title: '1. Spec Analysis',
      desc: 'Parameters & edge cases',
    },
    {
      id: 'step_2_synthesis',
      icon: <Code2 size={16} />,
      title: '2. Code & Tests',
      desc: 'Python + unittest',
    },
    {
      id: 'step_3_security',
      icon: <ShieldCheck size={16} />,
      title: '3. AST Policy',
      desc: 'Air-gap AST inspection',
    },
    {
      id: 'step_4_sandbox',
      icon: <Boxes size={16} />,
      title: '4. Sandboxed Run',
      desc: 'Isolated test execution',
    },
    {
      id: 'step_5_repair',
      icon: <Wrench size={16} />,
      title: '5. Self-Repair',
      desc: 'Automated 3-pass loop',
    },
    {
      id: 'step_6_artifact',
      icon: <CheckCircle2 size={16} />,
      title: '6. Verified Script',
      desc: 'Verified .py artifact',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      {/* ── TOP CONTROL & LAUNCHER BAR ── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
              }}
            >
              <Code2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Hero Workflow B — Secure Coding Agent & Sandbox
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--color-accent)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  PHASE 5
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Model: <strong style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{systemState.modelHealth?.default_model || 'qwen3.5:0.8b'}</strong> · Static AST Policy Guard, Sandboxed Unit Tests & Automated Self-Repair.
              </span>
            </div>
          </div>

          {/* Sandbox Engine Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Shield size={13} color="var(--color-success)" />
              <span style={{ color: 'var(--color-text-muted)' }}>SANDBOX:</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                {sandboxStatus?.active_engine === 'docker_isolated' ? 'DOCKER (NETWORK: NONE)' : 'SUBPROCESS (ISOLATED)'}
              </span>
            </div>

            {recentExecutions.length > 0 && (
              <button
                onClick={handleReset}
                className="btn btn-ghost"
                title="Start Fresh Task"
                style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw size={12} /> New Task
              </button>
            )}

            {onSwitchToWorkflowA && (
              <button
                onClick={onSwitchToWorkflowA}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '5px 10px' }}
              >
                Switch to Workflow A (Doc Audit)
              </button>
            )}
          </div>
        </div>

        {/* Preset Task Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            Presets:
          </span>
          {PRESET_CODING_TASKS.map((preset, idx) => (
            <button
              key={idx}
              disabled={isRunning}
              onClick={() => setPrompt(preset.prompt)}
              style={{
                background: prompt === preset.prompt ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface-2)',
                border: `1px solid ${prompt === preset.prompt ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: '11px',
                color: prompt === preset.prompt ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.title}</span>
            </button>
          ))}
        </div>

        {/* Prompt Input & Launch Action */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isRunning}
            placeholder="Describe the Python function/class to build and test..."
            style={{
              flex: 1,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--color-text-primary)',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '180px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <span>Max Repairs:</span>
              <select
                value={maxRepairs}
                onChange={(e) => setMaxRepairs(Number(e.target.value))}
                disabled={isRunning}
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  padding: '2px 6px',
                }}
              >
                <option value={1}>1 Attempt</option>
                <option value={2}>2 Attempts</option>
                <option value={3}>3 Attempts</option>
                <option value={5}>5 Attempts</option>
              </select>
            </div>

            {isRunning ? (
              <button
                onClick={handleCancel}
                className="btn btn-danger"
                style={{ height: '36px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <X size={14} /> Cancel Run
              </button>
            ) : (
              <button
                onClick={handleLaunchWorkflow}
                disabled={!prompt.trim()}
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Play size={14} /> Run Coding Loop
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}
      </div>

      {/* ── 6-NODE VISUAL EXECUTION GRAPH ── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="var(--color-accent)" />
            <span>Workflow B Pipeline State</span>
            {activeExecution && (
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                ({activeExecution.id})
              </span>
            )}
          </div>

          {activeExecution && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background:
                    activeExecution.status === 'completed'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : activeExecution.status === 'running'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  color:
                    activeExecution.status === 'completed'
                      ? 'var(--color-success)'
                      : activeExecution.status === 'running'
                      ? 'var(--color-warning)'
                      : 'var(--color-danger)',
                  border: '1px solid currentColor',
                }}
              >
                ● {activeExecution.status.toUpperCase()}
              </span>

              {activeExecution.duration_ms && (
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {(activeExecution.duration_ms / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* Nodes Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
          {canvasSteps.map((step, idx) => {
            const execStep = activeExecution?.steps.find((s) => s.id === step.id)
            const stepStatus = execStep?.status || 'pending'
            const isCurrent = activeExecution?.current_step_index === idx && activeExecution?.status === 'running'

            let borderColor = 'var(--color-border)'
            let bgColor = 'var(--color-surface-2)'
            let iconColor = 'var(--color-text-muted)'

            if (stepStatus === 'completed') {
              borderColor = 'rgba(16, 185, 129, 0.4)'
              bgColor = 'rgba(16, 185, 129, 0.05)'
              iconColor = 'var(--color-success)'
            } else if (stepStatus === 'repaired') {
              borderColor = 'rgba(14, 165, 233, 0.4)'
              bgColor = 'rgba(14, 165, 233, 0.05)'
              iconColor = '#0ea5e9'
            } else if (stepStatus === 'running' || isCurrent) {
              borderColor = 'var(--color-warning)'
              bgColor = 'rgba(245, 158, 11, 0.08)'
              iconColor = 'var(--color-warning)'
            } else if (stepStatus === 'failed') {
              borderColor = 'rgba(239, 68, 68, 0.4)'
              bgColor = 'rgba(239, 68, 68, 0.05)'
              iconColor = 'var(--color-danger)'
            }

            return (
              <div
                key={step.id}
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  position: 'relative',
                  transition: 'all var(--transition-normal)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: iconColor }}>{step.icon}</div>
                  {stepStatus === 'completed' && <Check size={12} color="var(--color-success)" />}
                  {stepStatus === 'repaired' && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#0ea5e9' }}>REPAIRED</span>
                  )}
                  {stepStatus === 'running' && (
                    <span className="spinner" style={{ width: '10px', height: '10px' }} />
                  )}
                  {stepStatus === 'failed' && <X size={12} color="var(--color-danger)" />}
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {execStep?.output_summary || step.desc}
                  </div>
                </div>

                {execStep?.duration_ms && (
                  <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 'auto' }}>
                    {(execStep.duration_ms / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SPLIT CODE & TELEMETRY INSPECTOR ── */}
      <div style={{ flex: 1, minHeight: '380px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* LEFT: Code & Test Suite Viewer */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 14px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
            }}
          >
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setActiveTab('code')}
                style={{
                  background: activeTab === 'code' ? 'var(--color-surface)' : 'transparent',
                  border: `1px solid ${activeTab === 'code' ? 'var(--color-border)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: activeTab === 'code' ? 700 : 500,
                  color: activeTab === 'code' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Code2 size={13} color="var(--color-accent)" /> solution.py
              </button>

              <button
                onClick={() => setActiveTab('tests')}
                style={{
                  background: activeTab === 'tests' ? 'var(--color-surface)' : 'transparent',
                  border: `1px solid ${activeTab === 'tests' ? 'var(--color-border)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: activeTab === 'tests' ? 700 : 500,
                  color: activeTab === 'tests' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileCode size={13} color="#0ea5e9" /> test_suite.py
              </button>
            </div>

            {/* Copy Button */}
            {activeExecution && (
              <button
                onClick={() =>
                  handleCopy(
                    activeTab === 'code'
                      ? activeExecution.solution_code || ''
                      : activeExecution.test_code || ''
                  )
                }
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copied ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {/* Code Viewer Area */}
          <div style={{ flex: 1, overflow: 'auto', background: '#070a12', padding: '14px' }}>
            {activeExecution ? (
              <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#e2e8f0', lineHeight: 1.6 }}>
                <code>
                  {activeTab === 'code'
                    ? activeExecution.solution_code || '# Code synthesis in progress...'
                    : activeExecution.test_code || '# Unit tests generation in progress...'}
                </code>
              </pre>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                Select a preset or click "Run Coding Loop" to generate verified code.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Sandbox Test Console & Telemetry */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Subheader with Metrics */}
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
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setActiveTab('terminal')}
                style={{
                  background: activeTab === 'terminal' ? 'var(--color-surface)' : 'transparent',
                  border: `1px solid ${activeTab === 'terminal' ? 'var(--color-border)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: activeTab === 'terminal' ? 700 : 500,
                  color: activeTab === 'terminal' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Terminal size={13} /> Sandbox Output
              </button>

              <button
                onClick={() => setActiveTab('repairs')}
                style={{
                  background: activeTab === 'repairs' ? 'var(--color-surface)' : 'transparent',
                  border: `1px solid ${activeTab === 'repairs' ? 'var(--color-border)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: activeTab === 'repairs' ? 700 : 500,
                  color: activeTab === 'repairs' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Wrench size={13} /> Self-Repairs ({activeExecution?.repairs_conducted || 0})
              </button>
            </div>

            {/* Test Summary Pill */}
            {activeExecution && (
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  ✓ {activeExecution.tests_passed} passed
                </span>
                {activeExecution.tests_failed > 0 && (
                  <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                    ✗ {activeExecution.tests_failed} failed
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {activeTab === 'repairs' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeExecution?.repair_history && activeExecution.repair_history.length > 0 ? (
                  activeExecution.repair_history.map((rep, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
                          Iteration #{rep.attempt_number}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: rep.test_result_success ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {rep.test_result_success ? '✓ PASSED TESTS' : '✗ FAILED (RE-TRIED)'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {rep.patch_applied}
                      </div>
                      {rep.error_traceback && (
                        <pre style={{ margin: 0, padding: '8px', background: '#05070d', borderRadius: '4px', fontSize: '10px', color: '#ef4444', overflowX: 'auto' }}>
                          {rep.error_traceback}
                        </pre>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '20px' }}>
                    {activeExecution?.status === 'completed'
                      ? '✓ Code passed all unit tests on the first execution. No self-repair iterations were required!'
                      : 'Self-repair iteration log will appear here if initial unit tests fail.'}
                  </div>
                )}
              </div>
            ) : (
              // Sandbox Terminal Output
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                {activeExecution ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      ─── AIR-GAP AST SECURITY AUDIT ───
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: activeExecution.ast_security_passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {activeExecution.ast_security_passed
                        ? '● AST Policy: 0 Prohibited Modules (No sockets, urllib, requests, subprocess)'
                        : `● Policy Violations: ${activeExecution.ast_violations.join(', ')}`}
                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
                      ─── SANDBOX TEST RUNNER LOGS ───
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '12px',
                        background: '#05070d',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: '#94a3b8',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                      }}
                    >
                      {activeExecution.sandbox_stdout ||
                        activeExecution.sandbox_stderr ||
                        'Initializing sandboxed test runner...'}
                    </pre>

                    {/* Verified Artifact Box */}
                    {activeExecution.status === 'completed' && activeExecution.artifact_filename && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '12px',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} /> Verified Python Script Ready
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {activeExecution.artifact_filename}
                          </div>
                        </div>

                        <a
                          href={getCodingArtifactDownloadUrl(activeExecution.id)}
                          download={activeExecution.artifact_filename}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                        >
                          <Download size={13} /> Download .py
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px', padding: '40px 0' }}>
                    Sandbox test execution stdout and telemetry will appear here.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
