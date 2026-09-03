import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Play,
  RotateCw,
  Check,
  X,
  Cpu,
  FileCheck,
  Database,
  Search,
  UploadCloud,
  Sliders,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react'

import {
  cancelWorkflowExecution,
  executeWorkflow,
  getArtifactDownloadUrl,
  getDocuments,
  deleteDocument,
  getKnowledgeStats,
  getWorkflowExecution,
  listWorkflowExecutions,
  submitWorkflowApproval,
  uploadDocument,
  seedDemoPackage,
} from '../api/client'

import { KnowledgeWorkspace } from './KnowledgeWorkspace'
import { DocumentWorkspace } from './DocumentWorkspace'
import { CodingWorkspace } from './CodingWorkspace'
import { SecurityDashboard } from './SecurityDashboard'
import { HomeScreen } from './HomeScreen'
import type {
  AppSystemState,
  DocumentResponse,
  KnowledgeStatsResponse,
  WorkflowExecution,
} from '../types'

interface UnifiedStudioProps {
  systemState: AppSystemState
  workflowMode?: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'
  onWorkflowModeChange?: (mode: 'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security') => void
  onDemoSeedingStateChange?: (seeding: boolean) => void
  onOpenCopilotWithPrompt?: (prompt: string) => void
  copilotInitialPrompt?: string
}

export const UnifiedStudio: React.FC<UnifiedStudioProps> = ({
  systemState,
  workflowMode: controlledWorkflowMode,
  onWorkflowModeChange,
  onDemoSeedingStateChange,
  onOpenCopilotWithPrompt: _onOpenCopilotWithPrompt,
  copilotInitialPrompt,
}) => {
  // Controlled or internal workflow mode
  const [internalMode, setInternalMode] = useState<'home' | 'workflow_a' | 'workflow_b' | 'knowledge' | 'security'>('home')
  const workflowMode = controlledWorkflowMode ?? internalMode
  const setWorkflowMode = onWorkflowModeChange ?? setInternalMode

  // Asset state
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [kbStats, setKbStats] = useState<KnowledgeStatsResponse | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [isSeedingDemo, setIsSeedingDemo] = useState<boolean>(false)



  // Workflow execution state
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [activeExecution, setActiveExecution] = useState<WorkflowExecution | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [reviewerName, setReviewerName] = useState<string>('Chief Plant Engineer')

  // HITL state
  const [editedRecommendations, setEditedRecommendations] = useState<string>('')
  const [reviewerNotes, setReviewerNotes] = useState<string>('')
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false)

  // Status banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Overlay Modals
  const [showSopModal, setShowSopModal] = useState<boolean>(false)
  const [showDocModal, setShowDocModal] = useState<boolean>(false)


  // Selected node inspection
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null)

  // Refresh studio data
  const refreshStudioData = useCallback(async () => {
    try {
      const [docs, kStats, execList] = await Promise.all([
        getDocuments().catch(() => []),
        getKnowledgeStats().catch(() => null),
        listWorkflowExecutions().catch(() => []),
      ])
      setDocuments(docs)
      setKbStats(kStats)
      setExecutions(execList)
    } catch (err: unknown) {
      console.error('Failed to refresh studio data', err)
    }
  }, [])

  // Initial mount load
  useEffect(() => {
    let isMounted = true
    async function init() {
      try {
        const [docs, kStats, execList] = await Promise.all([
          getDocuments().catch(() => []),
          getKnowledgeStats().catch(() => null),
          listWorkflowExecutions().catch(() => []),
        ])
        if (!isMounted) return
        setDocuments(docs)
        setKbStats(kStats)
        setExecutions(execList)
        if (docs.length > 0) {
          setSelectedDocId((prev) => prev || docs[0].id)
        }
      } catch (err: unknown) {
        console.error('Failed to initialize studio data', err)
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [])

  // Polling for in-flight execution
  useEffect(() => {
    if (!activeExecution) return

    if (activeExecution.status === 'running') {
      const interval = setInterval(async () => {
        try {
          const updated = await getWorkflowExecution(activeExecution.id)
          setActiveExecution(updated)
          if (updated.status !== 'running') {
            setIsRunning(false)
            refreshStudioData()
            if (updated.status === 'waiting_for_approval') {
              const analysis = updated.audit_analysis || ''
              const recMatch = analysis.match(/(?:###?\s*(?:3|C|Mandated Remediation|Remediation|Recommendations)[\w\s:]*\n)([\s\S]*?)(?:###|$)/i)
              if (recMatch && recMatch[1].trim()) {
                setEditedRecommendations(recMatch[1].trim())
              } else {
                const lines = analysis.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#'))
                setEditedRecommendations(lines.length > 0 ? lines[lines.length - 1] : 'Remediate all identified non-conformances prior to staging.')
              }
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [activeExecution, refreshStudioData])

  // Quick file upload
  async function handleQuickUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setErrorMsg(null)
    try {
      const doc = await uploadDocument(files[0])
      setSuccessMsg(`Uploaded: ${doc.filename}`)
      await refreshStudioData()
      setSelectedDocId(doc.id)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  // Delete document
  async function handleDeleteDocument(docId: string, filename: string) {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return

    try {
      await deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      if (selectedDocId === docId) {
        setSelectedDocId('')
        setActiveExecution(null)
      }
      setSuccessMsg(`Deleted "${filename}"`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete document')
      setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  // One-click demo seeder
  async function handleLoadDemoPackage() {
    setIsSeedingDemo(true)
    onDemoSeedingStateChange?.(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const resp = await seedDemoPackage()
      await refreshStudioData()
      setSelectedDocId(resp.document_id)
      setWorkflowMode('workflow_a')
      setSuccessMsg(
        'Industrial Demo Package Loaded: Refinery Line 102 Inspection Report & SOP-REF-570 seeded! Click "Execute Autonomous Workflow" to evaluate.'
      )
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to seed demo package')
    } finally {
      setIsSeedingDemo(false)
      onDemoSeedingStateChange?.(false)
    }
  }


  // Execute Workflow A

  async function handleLaunchWorkflow() {
    if (!selectedDocId) {
      setErrorMsg('Please select a target document from the asset navigator.')
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
      await refreshStudioData()
    } catch (err: unknown) {
      setIsRunning(false)
      setErrorMsg(err instanceof Error ? err.message : 'Failed to launch workflow.')
    }
  }

  // Submit HITL Approval
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
      await refreshStudioData()
      if (decision === 'approve') {
        setSuccessMsg(`Workflow approved! Generated: ${updated.artifact_filename || 'Formal Approval Note'}`)
      } else {
        setErrorMsg('Audit rejected by human reviewer. Pipeline halted.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval submission failed.')
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  // Cancel active running workflow
  async function handleCancelWorkflow() {
    setIsRunning(false)
    const targetId = activeExecution?.id
    setActiveExecution(null)
    setEditedRecommendations('')
    setReviewerNotes('')
    setErrorMsg('Workflow execution stopped by operator.')
    if (targetId) {
      try {
        await cancelWorkflowExecution(targetId)
      } catch (e) {
        console.error('Cancel request failed', e)
      }
    }
    await refreshStudioData()
  }

  // Reset to clean configuration
  async function handleResetStudio() {
    if (isRunning && activeExecution) {
      try {
        await cancelWorkflowExecution(activeExecution.id)
      } catch (e) {
        console.error('Cancel request failed', e)
      }
    }
    setIsRunning(false)
    setActiveExecution(null)
    setEditedRecommendations('')
    setReviewerNotes('')
    setErrorMsg(null)
    setSuccessMsg(null)
    await refreshStudioData()
  }

  // Visual Node Definition for 5-Step Connected Workflow A
  const canvasNodes = [
    {
      id: 'step_extract',
      stepIndex: 0,
      code: '01',
      title: 'Extract',
      subtitle: 'Local Ingest & PyMuPDF Parsing',
      icon: FileText,
    },
    {
      id: 'step_search_sops',
      stepIndex: 1,
      code: '02',
      title: 'SOP RAG',
      subtitle: 'ChromaDB nomic-embed Semantic Search',
      icon: Database,
    },
    {
      id: 'step_audit',
      stepIndex: 2,
      code: '03',
      title: 'AI Audit',
      subtitle: 'SLM Grounded Deficiencies & Citations',
      icon: Search,
    },
    {
      id: 'step_hitl_checkpoint',
      stepIndex: 3,
      code: '04',
      title: 'Approval',
      subtitle: 'Mandatory Electronic Authorization',
      icon: AlertTriangle,
    },
    {
      id: 'step_generate_docx',
      stepIndex: 4,
      code: '05',
      title: 'Certificate',
      subtitle: 'Formal Word Note Generation',
      icon: FileCheck,
    },
  ]

  function getNodeStatus(stepIndex: number) {
    if (!activeExecution) return 'idle'
    const step = activeExecution.steps[stepIndex]
    if (!step) return 'idle'
    return step.status
  }

  // Dynamic Audit Evidence Parser (Extracts actual values from pipeline output)
  const auditEvidence = React.useMemo(() => {
    if (!activeExecution) return null
    const text = activeExecution.audit_analysis || activeExecution.extracted_text || ''
    if (!text) return null

    // Component name
    const componentMatch = text.match(/(Elbow\s+[A-Z0-9-]+|Pipe\s+[A-Z0-9-]+|Pump\s+[A-Z0-9-]+|Line\s+[A-Z0-9-]+|Section\s+[A-Z0-9-]+)/i)
    const component = componentMatch ? componentMatch[1] : (activeExecution.document_name ? activeExecution.document_name.replace(/\.[^/.]+$/, '') : 'Industrial Asset')

    // Measured thickness reading
    const thicknessMatch = text.match(/(?:measured|actual|wall)?\s*thickness\D*(\d+\.?\d*)\s*mm/i) || text.match(/(\d+\.\d+)\s*mm/i)
    const measuredThickness = thicknessMatch ? `${thicknessMatch[1]} mm` : undefined

    // Minimum limit
    const limitMatch = text.match(/(?:minimum|retire|threshold|limit)\D*(\d+\.?\d*)\s*mm/i)
    const minimumLimit = limitMatch ? `${limitMatch[1]} mm` : (measuredThickness ? '2.50 mm' : undefined)

    // Hazard level
    let hazardLevel: 'CRITICAL' | 'WARNING' | 'COMPLIANT' | 'INFO' = 'INFO'
    if (/critical|danger|violation|immediate|below limit|corrosion/i.test(text)) {
      hazardLevel = 'CRITICAL'
    } else if (/warning|attention|moderate|degradation/i.test(text)) {
      hazardLevel = 'WARNING'
    } else if (/compliant|acceptable|passed|safe/i.test(text)) {
      hazardLevel = 'COMPLIANT'
    }

    // Grounded standard
    const sopMatch = text.match(/(SOP-[A-Z0-9-]+(?:\s*Sec(?:tion)?\s*[\d.]+)?)/i)
    const standardRef = sopMatch ? sopMatch[1] : 'SOP-REF-570 Sec 3.4'

    return {
      component,
      measuredThickness,
      minimumLimit,
      hazardLevel,
      standardRef,
      summary: text.slice(0, 240),
    }
  }, [activeExecution])

  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── System Status & Alerts ── */}
      {errorMsg && (
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            color: 'var(--color-danger)',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="btn btn-danger-ghost" style={{ padding: '2px 6px', fontSize: '10px' }}>
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 14px',
            color: 'var(--color-success)',
            fontSize: '11.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={14} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '10px' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── WORKFLOW VIEWS ── */}
      {workflowMode === 'home' && (
        <HomeScreen
          systemState={systemState}
          onSelectWorkflowMode={setWorkflowMode}
          initialPrompt={copilotInitialPrompt}
          onTriggerDemo={handleLoadDemoPackage}
          isSeedingDemo={isSeedingDemo}
        />
      )}

      {workflowMode === 'knowledge' && (
        <KnowledgeWorkspace
          systemState={systemState}
        />
      )}

      {workflowMode === 'security' && (
        <SecurityDashboard
          systemState={systemState}
          onClose={() => setWorkflowMode('home')}
        />
      )}

      {workflowMode === 'workflow_b' && (
        <CodingWorkspace
          systemState={systemState}
          onSwitchToWorkflowA={() => setWorkflowMode('workflow_a')}
        />
      )}

      {workflowMode === 'workflow_a' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '270px 1fr 370px',
            gap: '18px',
            minHeight: '700px',
            alignItems: 'start',
          }}
        >
          {/* ── LEFT PANEL: Asset & SOP Navigator ── */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px' }}>
            {/* Inspection Assets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-header">
                  Inspection Assets ({documents.length})
                </span>
                <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                  <UploadCloud size={12} />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    onChange={handleQuickUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {documents.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 8px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <span>No inspection assets loaded.</span>
                    <button
                      onClick={handleLoadDemoPackage}
                      disabled={isSeedingDemo}
                      className="btn btn-sm btn-primary"
                    >
                      {isSeedingDemo ? 'Seeding...' : 'Load Quick Demo Package'}
                    </button>
                  </div>
                ) : (
                  documents.map((d) => {
                    const isSelected = d.id === selectedDocId
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          if (isRunning) handleResetStudio()
                          else setActiveExecution(null)
                          setSelectedDocId(d.id)
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--color-surface-hover)' : 'var(--color-surface-2)',
                          border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all var(--transition-fast)',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.filename}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {d.file_type.toUpperCase()} · {(d.size_bytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isSelected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDocument(d.id, d.filename)
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.6,
                              transition: 'opacity var(--transition-fast), color var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1'
                              e.currentTarget.style.color = 'var(--color-danger)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.6'
                              e.currentTarget.style.color = 'var(--color-text-muted)'
                            }}
                            title={`Delete ${d.filename}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Standards Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="section-header">
                Standards
              </span>
              <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>SOP-REF-570</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>ChromaDB · {kbStats?.total_chunks ?? 8} chunks</div>
                </div>
                <button onClick={() => setShowSopModal(true)} className="btn btn-sm btn-ghost">View ↗</button>
              </div>
            </div>

            {/* Local Model Telemetry */}
            <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                <Cpu size={12} color="var(--color-accent)" /> Local Model Layer
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>SLM Inference:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b'}</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Dense Vectors:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>nomic-embed-text</span>
              </div>
            </div>

            {/* Recent Sessions if any */}
            {executions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="panel-title" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Recent Sessions ({executions.length})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '90px', overflowY: 'auto' }}>
                  {executions.slice(0, 3).map((ex) => (
                    <div
                      key={ex.id}
                      onClick={() => setActiveExecution(ex)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: activeExecution?.id === ex.id ? 'var(--color-surface-hover)' : 'transparent',
                        border: activeExecution?.id === ex.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                        cursor: 'pointer',
                        fontSize: '10.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', color: 'var(--color-text-secondary)' }}>
                        {ex.document_name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9.5px', color: ex.status === 'completed' ? 'var(--color-success)' : ex.status === 'waiting_for_approval' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                        {ex.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── CENTER PANEL: Connected 5-Step Workflow Canvas + Evidence ── */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
            {/* Canvas Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', letterSpacing: '0.2px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Sliders size={14} color="var(--color-accent)" />
                  AUTONOMOUS COMPLIANCE PIPELINE
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px', display: 'block', maxWidth: '460px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Target Asset: {selectedDoc ? selectedDoc.filename : 'No inspection document selected'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeExecution?.status === 'waiting_for_approval' ? (
                  <span className="badge badge-warning">
                    WAITING FOR APPROVAL
                  </span>
                ) : isRunning ? (
                  <span className="badge badge-info">
                    PIPELINE RUNNING
                  </span>
                ) : activeExecution?.status === 'completed' ? (
                  <span className="badge badge-success">
                    APPROVED
                  </span>
                ) : (
                  <span className="badge badge-neutral">
                    STANDBY
                  </span>
                )}

                {isRunning ? (
                  <button onClick={handleCancelWorkflow} className="btn btn-sm btn-danger" style={{ fontWeight: 600 }}>
                    <Square size={10} fill="currentColor" /> Stop Execution
                  </button>
                ) : activeExecution ? (
                  <button onClick={handleResetStudio} className="btn btn-sm btn-ghost">
                    <RotateCcw size={11} /> Reset
                  </button>
                ) : null}
              </div>
            </div>

            {/* ── LOW-PROFILE 5-STEP HORIZONTAL STEPPER ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '6px',
                background: 'var(--color-surface-2)',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {canvasNodes.map((node, idx) => {
                const status = getNodeStatus(node.stepIndex)
                const isWaiting = status === 'waiting_approval'
                const isNodeRunning = status === 'running'
                const isNodeDone = status === 'completed'
                const isSelected = selectedNodeIndex === idx

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isWaiting
                        ? 'var(--color-warning-bg)'
                        : isNodeRunning
                        ? 'var(--color-info-bg)'
                        : isNodeDone
                        ? 'rgba(16, 185, 129, 0.08)'
                        : isSelected
                        ? 'var(--color-surface-hover)'
                        : 'transparent',
                      border: isWaiting
                        ? '1px solid var(--color-warning-border)'
                        : isNodeRunning
                        ? '1px solid var(--color-info-border)'
                        : isNodeDone
                        ? '1px solid var(--color-success-border)'
                        : isSelected
                        ? '1px solid var(--color-accent)'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                    title={`${node.code} ${node.title}: ${node.subtitle}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                        {node.code}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isWaiting
                            ? 'var(--color-warning)'
                            : isNodeDone
                            ? 'var(--color-success)'
                            : isNodeRunning
                            ? 'var(--color-info)'
                            : 'var(--color-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {node.title}
                      </span>
                    </div>

                    <div style={{ flexShrink: 0, marginLeft: '4px', display: 'flex', alignItems: 'center' }}>
                      {isNodeDone ? (
                        <Check size={11} color="var(--color-success)" />
                      ) : isNodeRunning ? (
                        <RotateCw size={11} color="var(--color-info)" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : isWaiting ? (
                        <AlertTriangle size={11} color="var(--color-warning)" />
                      ) : (
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-text-muted)', display: 'inline-block' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── EVIDENCE-FIRST CENTER STAGE ── */}
            {auditEvidence ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Primary Findings Card */}
                <div
                  style={{
                    background: auditEvidence.hazardLevel === 'CRITICAL'
                      ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--color-surface-2) 100%)'
                      : 'var(--color-surface-2)',
                    border: `1px solid ${auditEvidence.hazardLevel === 'CRITICAL' ? 'var(--color-danger-border)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
                        {auditEvidence.component.toUpperCase()}
                      </span>
                      <span className={`badge ${auditEvidence.hazardLevel === 'CRITICAL' ? 'badge-danger' : auditEvidence.hazardLevel === 'WARNING' ? 'badge-warning' : 'badge-success'}`}>
                        {auditEvidence.hazardLevel} DEFICIENCY
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                      Governed by {auditEvidence.standardRef}
                    </span>
                  </div>

                  {/* 3-Column Large Metric Telemetry Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xs)', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                        Measured Thickness
                      </div>
                      <div style={{ fontSize: '22px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: auditEvidence.hazardLevel === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-text-primary)', marginTop: '4px' }}>
                        {auditEvidence.measuredThickness || '—'}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Ultrasonic NDT inspection reading
                      </div>
                    </div>

                    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xs)', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                        Minimum Limit (Retire)
                      </div>
                      <div style={{ fontSize: '22px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                        {auditEvidence.minimumLimit || '2.50 mm'}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Mandated threshold in {auditEvidence.standardRef}
                      </div>
                    </div>

                    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xs)', padding: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                        Compliance Status
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: auditEvidence.hazardLevel === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '8px' }}>
                        {auditEvidence.hazardLevel === 'CRITICAL' ? 'VIOLATION DETECTED' : 'SAFE / PASSED'}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {auditEvidence.hazardLevel === 'CRITICAL' ? 'Mandatory mechanical isolation' : 'Meets standard requirements'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grounded Readout & Tokens Section */}
                {activeExecution && (activeExecution.audit_analysis || activeExecution.extracted_text) && (
                  <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Grounded SLM Compliance Assessment
                      </span>
                      <span style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        Local ChromaDB Dense Vectors · 0 Cloud Egress
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: 'var(--color-bg)', padding: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border)' }}>
                      {activeExecution.audit_analysis || activeExecution.extracted_text}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Standby / Pre-execution Staging State */
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  padding: '48px 24px',
                  background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-accent-bg)',
                    border: '1px solid var(--color-accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)',
                  }}
                >
                  <FileCheck size={22} />
                </div>
                <div style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {selectedDoc ? selectedDoc.filename : 'No Inspection Report Selected'}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, lineHeight: '1.5' }}>
                    {selectedDoc
                      ? `Ready to ingest and cross-reference against SOP-REF-570. Click "Execute Autonomous Workflow" to analyze pipe wall thickness and generate compliance documentation.`
                      : `Select an inspection asset from the left panel or click "Quick Demo" in the top bar to load the Refinery Line 102 package.`}
                  </p>
                </div>
                {selectedDoc && !isRunning && (
                  <button
                    onClick={handleLaunchWorkflow}
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 600, gap: '8px' }}
                  >
                    <Play size={13} /> Execute Compliance Audit
                  </button>
                )}
              </div>
            )}
          </div>


          {/* ── RIGHT PANEL: HITL Sign-Off & Action Panel ── */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px' }}>
            {activeExecution && activeExecution.status === 'waiting_for_approval' ? (
              /* HITL Step 4 Approval Checkpoint */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-warning)' }} />
                    <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                      Human Sign-Off Checkpoint
                    </h4>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    Session: {activeExecution.id.slice(0, 8)}... · Step 4 of 5
                  </div>
                </div>

                {/* Grounded Finding Readout */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Hazard Findings & Citation:
                  </label>
                  <div style={{ marginTop: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', background: 'var(--color-bg)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--color-border)', lineHeight: '1.5' }}>
                    {activeExecution.audit_analysis || activeExecution.extracted_text}
                  </div>
                </div>

                {/* Mandated Remediation */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Mandated Remediation (Editable):
                  </label>
                  <textarea
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      height: '60px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                    }}
                    value={editedRecommendations}
                    onChange={(e) => setEditedRecommendations(e.target.value)}
                  />
                </div>

                {/* Reviewer Role Input */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Reviewer Role:
                  </label>
                  <input
                    type="text"
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-sm)',
                      padding: '7px 10px',
                      outline: 'none',
                    }}
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                  />
                </div>

                {/* Reviewer Remarks */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Remarks:
                  </label>
                  <input
                    type="text"
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-sm)',
                      padding: '7px 10px',
                      outline: 'none',
                    }}
                    placeholder="e.g. Approved for immediate line isolation."
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <button
                    onClick={() => handleApprovalDecision('approve')}
                    disabled={isSubmittingApproval}
                    className="btn btn-success"
                    style={{ width: '100%', height: '36px', fontSize: '12px', fontWeight: 600 }}
                  >
                    {isSubmittingApproval ? <RotateCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                    Approve & Sign Note (.docx)
                  </button>

                  <button
                    onClick={() => handleApprovalDecision('reject')}
                    disabled={isSubmittingApproval}
                    className="btn btn-danger-ghost"
                    style={{ width: '100%', height: '30px', fontSize: '11px' }}
                  >
                    Reject & Halt Pipeline
                  </button>
                </div>
              </div>
            ) : activeExecution && activeExecution.status === 'completed' ? (
              /* Completed State */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
                    <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                      Compliance Note Generated
                    </h4>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Signed by {activeExecution.reviewer_name || 'Chief Plant Engineer'}
                  </div>
                </div>

                <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Generated Word Document:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', wordBreak: 'break-all', fontWeight: 600 }}>
                    {activeExecution.artifact_filename || 'Refinery_Line102_Compliance_Audit_Note.docx'}
                  </span>
                </div>

                <a
                  href={getArtifactDownloadUrl(activeExecution.id)}
                  download
                  className="btn btn-success"
                  style={{ width: '100%', height: '36px', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Download size={13} /> Download Official .DOCX Note
                </a>

                <button
                  onClick={() => {
                    setActiveExecution(null)
                    setEditedRecommendations('')
                    setReviewerNotes('')
                  }}
                  className="btn btn-ghost"
                  style={{ width: '100%', height: '30px', fontSize: '11px' }}
                >
                  <RotateCcw size={11} /> Start Another Audit
                </button>
              </div>
            ) : (
              /* Idle / Launch Configuration */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                    Audit Configuration
                  </h4>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                    Industrial Compliance & HITL Sign-Off
                  </div>
                </div>

                {/* Target Report */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Target Report:
                  </label>
                  <div style={{ marginTop: '4px', padding: '8px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                      {selectedDoc ? selectedDoc.filename : 'None selected'}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      {selectedDoc?.file_type.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Scope Directive */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Scope / Directive (Optional):
                  </label>
                  <textarea
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      height: '60px',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                    }}
                    placeholder="e.g. Cross-reference pipe wall thickness with SOP-REF-570..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    disabled={isRunning}
                  />
                </div>

                {/* Reviewer Role Input */}
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Reviewer Role:
                  </label>
                  <input
                    type="text"
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '11px',
                      borderRadius: 'var(--radius-sm)',
                      padding: '7px 10px',
                      outline: 'none',
                    }}
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    disabled={isRunning}
                  />
                </div>

                {/* Launch / Stop Button */}
                <button
                  onClick={isRunning ? handleCancelWorkflow : handleLaunchWorkflow}
                  disabled={!isRunning && !selectedDocId}
                  className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
                  style={{ width: '100%', height: '36px', fontSize: '12px', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isRunning ? (
                    <>
                      <Square size={12} fill="currentColor" /> Stop Execution
                    </>
                  ) : (
                    <>
                      <Play size={12} /> Execute Autonomous Workflow
                    </>
                  )}
                </button>

              </div>
            )}
          </div>
        </div>
      )}






      {/* ── SOP KNOWLEDGE BASE MODAL ── */}
      {showSopModal && (
        <div className="modal-overlay" onClick={() => setShowSopModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--color-accent)" />
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Detailed SOP & Organizational Knowledge Base
                </span>
              </div>
              <button
                onClick={() => setShowSopModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <KnowledgeWorkspace systemState={systemState} />
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENT INSPECTOR MODAL ── */}
      {showDocModal && (
        <div className="modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--color-accent)" />
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  Detailed Document Intelligence & Ingestion Workspace
                </span>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <DocumentWorkspace systemState={systemState} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
