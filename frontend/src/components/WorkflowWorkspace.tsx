import React, { useEffect, useState, useCallback } from 'react'
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Play,
  RotateCw,
  Check,
  X,
  Cpu,
  Layers,
  FileCheck,
} from 'lucide-react'
import {
  executeWorkflow,
  getArtifactDownloadUrl,
  getDocuments,
  getWorkflowExecution,
  listWorkflowExecutions,
  routeModel,
  submitWorkflowApproval,
} from '../api/client'
import type {
  DocumentResponse,
  ModelRouteResponse,
  WorkflowExecution,
} from '../types'

export const WorkflowWorkspace: React.FC = () => {
  // Document state
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [reviewerName, setReviewerName] = useState<string>('Chief Plant Engineer')

  // Workflow state
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [activeExecution, setActiveExecution] = useState<WorkflowExecution | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // HITL interactive state
  const [editedRecommendations, setEditedRecommendations] = useState<string>('')
  const [reviewerNotes, setReviewerNotes] = useState<string>('')
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false)

  // Router tester state
  const [routerPrompt, setRouterPrompt] = useState<string>('')
  const [routerDecision, setRouterDecision] = useState<ModelRouteResponse | null>(null)
  const [isRouting, setIsRouting] = useState<boolean>(false)

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments()
      setDocuments(docs)
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id)
      }
    } catch (err: unknown) {
      console.error('Failed to load documents', err)
    }
  }, [selectedDocId])

  const loadExecutions = useCallback(async () => {
    try {
      const list = await listWorkflowExecutions()
      setExecutions(list)
      if (list.length > 0 && !activeExecution) {
        setActiveExecution(list[0])
      }
    } catch (err: unknown) {
      console.error('Failed to load executions', err)
    }
  }, [activeExecution])

  // Initial fetch
  useEffect(() => {
    loadDocuments()
    loadExecutions()
  }, [loadDocuments, loadExecutions])

  // Polling for active execution while running
  useEffect(() => {
    if (!activeExecution) return

    if (activeExecution.status === 'running') {
      const interval = setInterval(async () => {
        try {
          const updated = await getWorkflowExecution(activeExecution.id)
          setActiveExecution(updated)
          if (updated.status !== 'running') {
            setIsRunning(false)
            loadExecutions()
            if (updated.status === 'waiting_for_approval') {
              setEditedRecommendations(
                'Immediate line depressurization within 4 hours. Mandatory emergency spool replacement within 48 hours.'
              )
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [activeExecution, loadExecutions])

  async function handleStartWorkflow() {
    if (!selectedDocId) {
      setErrorMsg('Please select a target document first.')
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)
    setIsRunning(true)

    try {
      const exec = await executeWorkflow({
        document_id: selectedDocId,
        custom_prompt: customPrompt.trim() || undefined,
        reviewer_name: reviewerName.trim() || 'Chief Plant Engineer',
      })
      setActiveExecution(exec)
      loadExecutions()
    } catch (err: unknown) {
      setIsRunning(false)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch workflow.')
    }
  }

  async function handleApprovalDecision(decision: 'approve' | 'reject') {
    if (!activeExecution) return
    setIsSubmittingApproval(true)
    setErrorMsg(null)

    try {
      await submitWorkflowApproval(activeExecution.id, {
        decision,
        reviewer_name: reviewerName.trim() || 'Chief Plant Engineer',
        reviewer_notes: reviewerNotes.trim() || undefined,
        edited_recommendations: editedRecommendations.trim() || undefined,
      })
      const updated = await getWorkflowExecution(activeExecution.id)
      setActiveExecution(updated)
      loadExecutions()
      if (decision === 'approve') {
        setSuccessMsg(`Workflow approved! Generated formal artifact: ${updated.artifact_filename || 'Approval Note'}`)
      } else {
        setErrorMsg('Audit rejected by reviewer. Execution halted without DOCX generation.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval submission failed.')
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  async function handleTestRouter() {
    if (!routerPrompt.trim()) return
    setIsRouting(true)
    try {
      const res = await routeModel({ prompt: routerPrompt })
      setRouterDecision(res)
    } catch (err: unknown) {
      console.error('Router test error', err)
    } finally {
      setIsRouting(false)
    }
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'running':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--color-info)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <RotateCw size={11} className="spin-animation" /> RUNNING
          </span>
        )
      case 'waiting_for_approval':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--color-warning)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}
          >
            <AlertTriangle size={11} /> WAITING APPROVAL
          </span>
        )
      case 'completed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={11} /> COMPLETED
          </span>
        )
      case 'rejected':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <X size={11} /> REJECTED
          </span>
        )
      case 'failed':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            FAILED
          </span>
        )
      default:
        return (
          <span
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {status.toUpperCase()}
          </span>
        )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Header Banner ── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Agentic Hero Workflow & Human-in-the-Loop Canvas
            </h2>
            <p style={{ fontSize: '12px', margin: '3px 0 0 0', color: 'var(--color-text-muted)' }}>
              Autonomous 5-step pipeline: Document Extraction → ChromaDB SOP Search → RAG Audit →{' '}
              <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Human Sign-Off</span> → Formatted DOCX Generation.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-success)',
            }}
          >
            <ShieldCheck size={14} />
            Auto-Router: qwen3.5 (VLM/Audit) + nomic-embed
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--color-danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--color-success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* ── Left Column: Controls, Auto-Router, History ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Launch New Hero Workflow */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Play size={14} color="var(--color-accent)" /> 1. Launch Hero Workflow
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Milestone 4
              </span>
            </div>

            {/* Target Document Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Target Inspection Document
              </label>
              <select
                style={{
                  width: '100%',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  outline: 'none',
                }}
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                disabled={isRunning}
              >
                {documents.length === 0 ? (
                  <option value="">No documents in registry</option>
                ) : (
                  documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename} ({d.file_type.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Compliance Directive Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Compliance Directive / Custom Focus
              </label>
              <textarea
                style={{
                  width: '100%',
                  height: '70px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  outline: 'none',
                  resize: 'none',
                }}
                placeholder="e.g. Cross-reference wall thickness against ASTM & refinery SOP retirement limits..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isRunning}
              />
            </div>

            {/* Reviewer Name */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Human Approver Authority
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  outline: 'none',
                }}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                disabled={isRunning}
              />
            </div>

            {/* Run Button */}
            <button
              onClick={handleStartWorkflow}
              disabled={isRunning || documents.length === 0}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                background: isRunning ? 'rgba(99, 102, 241, 0.4)' : 'var(--color-accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)',
                boxShadow: isRunning ? 'none' : '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              {isRunning ? (
                <>
                  <RotateCw size={14} className="spin-animation" /> Executing Pipeline...
                </>
              ) : (
                <>
                  <Zap size={14} /> Run Autonomous Hero Pipeline
                </>
              )}
            </button>
          </div>

          {/* Card 2: Multi-Model Auto-Router Tester */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={13} color="var(--color-info)" /> Multi-Model Auto-Router
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--color-info)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                Auto-Routing
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Test routing (e.g. 'Write python script' or 'SOP check')"
                style={{
                  flex: 1,
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  outline: 'none',
                }}
                value={routerPrompt}
                onChange={(e) => setRouterPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestRouter()}
              />
              <button
                onClick={handleTestRouter}
                disabled={isRouting}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                Route
              </button>
            </div>

            {routerDecision && (
              <div
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Inferred Task:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-info)', fontWeight: 700 }}>
                    {routerDecision.task_type.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Routed Model:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
                    {routerDecision.selected_model}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--color-border)' }}>
                  {routerDecision.reason}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Execution Sessions History */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={13} /> Execution Sessions ({executions.length})
              </div>
              <button
                onClick={loadExecutions}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <RotateCw size={11} /> Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {executions.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
                  No workflow sessions yet.
                </div>
              ) : (
                executions.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => setActiveExecution(e)}
                    style={{
                      background: activeExecution?.id === e.id ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-bg)',
                      border: activeExecution?.id === e.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                        {e.document_name}
                      </span>
                      {renderStatusBadge(e.status)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {e.id.slice(0, 10)}...</span>
                      <span>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* ── Right Column: Live Stepper Graph, HITL Checkpoint, Artifact Download ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeExecution ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Stepper Pipeline Card */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--color-accent)" />
                      <span>Pipeline:</span>
                      <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{activeExecution.document_name}</span>
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      Session ID: {activeExecution.id}
                    </div>
                  </div>
                  <div>
                    {renderStatusBadge(activeExecution.status)}
                  </div>
                </div>

                {/* Stepper Steps List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Autonomous Step Execution Graph
                  </div>

                  {activeExecution.steps.map((step, idx) => {
                    const isCurrent = activeExecution.current_step_index === idx && activeExecution.status === 'running'
                    const isWaiting = step.status === 'waiting_approval'

                    return (
                      <div
                        key={step.id}
                        style={{
                          background: isWaiting
                            ? 'rgba(245, 158, 11, 0.08)'
                            : isCurrent
                            ? 'rgba(99, 102, 241, 0.08)'
                            : step.status === 'completed'
                            ? 'var(--color-bg)'
                            : 'rgba(22, 28, 45, 0.4)',
                          border: isWaiting
                            ? '1px solid var(--color-warning)'
                            : isCurrent
                            ? '1px solid var(--color-accent)'
                            : step.status === 'completed'
                            ? '1px solid var(--color-border)'
                            : '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {step.status === 'completed' ? (
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                <Check size={12} />
                              </div>
                            ) : step.status === 'running' ? (
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid var(--color-info)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RotateCw size={12} className="spin-animation" />
                              </div>
                            ) : step.status === 'waiting_approval' ? (
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                !
                              </div>
                            ) : step.status === 'failed' ? (
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={12} />
                              </div>
                            ) : (
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                                {idx + 1}
                              </div>
                            )}

                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {step.title}
                            </span>
                          </div>

                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                            {step.status.toUpperCase()}
                          </span>
                        </div>

                        {step.output_summary && (
                          <div style={{ marginLeft: '32px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {step.output_summary}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── HITL Checkpoint Card (Active when waiting for approval) ── */}
              {activeExecution.status === 'waiting_for_approval' && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.06)',
                    border: '2px solid var(--color-warning)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-warning)',
                      }}
                    >
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-warning)' }}>
                        Human-in-the-Loop Checkpoint Required (Step 4)
                      </h4>
                      <p style={{ fontSize: '12px', margin: '2px 0 0 0', color: 'var(--color-text-secondary)' }}>
                        The autonomous pipeline has safely paused. Review findings and SOP compliance evaluation below before authorizing DOCX generation.
                      </p>
                    </div>
                  </div>

                  {/* Findings Preview */}
                  <div
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      Auditor Evaluation & SOP Citations:
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-mono)',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        background: 'var(--color-surface)',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {activeExecution.audit_analysis || activeExecution.extracted_text || 'Inspection report analyzed.'}
                    </div>
                  </div>

                  {/* Editable Recommendations */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '6px' }}>
                      Mandated Corrective Actions & Recommendations (Editable by Reviewer):
                    </label>
                    <textarea
                      style={{
                        width: '100%',
                        height: '70px',
                        background: 'var(--color-bg)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px',
                        outline: 'none',
                        resize: 'none',
                      }}
                      value={editedRecommendations}
                      onChange={(e) => setEditedRecommendations(e.target.value)}
                    />
                  </div>

                  {/* Reviewer Sign-Off Remarks */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      Human Reviewer Sign-Off Remarks:
                    </label>
                    <input
                      type="text"
                      style={{
                        width: '100%',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        outline: 'none',
                      }}
                      placeholder="e.g. Ultrasonic reading validated against calibration log. Approved for immediate outage window."
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                    />
                  </div>

                  {/* Approve / Reject Buttons */}
                  <div style={{ display: 'flex', gap: '12px', paddingTop: '6px' }}>
                    <button
                      onClick={() => handleApprovalDecision('approve')}
                      disabled={isSubmittingApproval}
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        cursor: isSubmittingApproval ? 'not-allowed' : 'pointer',
                        background: 'var(--color-success)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 12px rgba(16, 185, 129, 0.3)',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {isSubmittingApproval ? (
                        <>
                          <RotateCw size={15} className="spin-animation" /> Compiling DOCX...
                        </>
                      ) : (
                        <>
                          <Check size={15} /> Approve & Generate Formal DOCX Note
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleApprovalDecision('reject')}
                      disabled={isSubmittingApproval}
                      style={{
                        padding: '12px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-danger)',
                        cursor: isSubmittingApproval ? 'not-allowed' : 'pointer',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--color-danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <X size={15} /> Reject Audit
                    </button>
                  </div>
                </div>
              )}

              {/* ── Completed DOCX Artifact Download Card ── */}
              {activeExecution.status === 'completed' && activeExecution.artifact_url && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-success)',
                      }}
                    >
                      <FileCheck size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-success)' }}>
                        Formal DOCX Approval Note Ready
                      </h4>
                      <p style={{ fontSize: '12px', margin: '2px 0 0 0', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {activeExecution.artifact_filename}
                      </p>
                    </div>
                  </div>

                  <a
                    href={getArtifactDownloadUrl(activeExecution.id)}
                    download
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-success)',
                      color: '#fff',
                      textDecoration: 'none',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Download size={14} /> Download .DOCX Note
                  </a>
                </div>
              )}

            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '48px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--color-surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Zap size={26} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                No Active Hero Workflow Selected
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '420px', margin: 0 }}>
                Select an inspection document on the left and click <strong>Run Autonomous Hero Pipeline</strong> to execute the full autonomous compliance audit.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
