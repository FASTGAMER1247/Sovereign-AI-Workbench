import React, { useState, useEffect, useCallback } from 'react'
import {
  Zap,
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
  MessageSquare,
  UploadCloud,
  Sliders,
  Code2,
  RotateCcw,
  ChevronRight,
  Shield,
} from 'lucide-react'
import {
  cancelWorkflowExecution,
  executeWorkflow,
  getArtifactDownloadUrl,
  getDocuments,
  getKnowledgeStats,
  getWorkflowExecution,
  listWorkflowExecutions,
  submitWorkflowApproval,
  uploadDocument,
} from '../api/client'
import { KnowledgeWorkspace } from './KnowledgeWorkspace'
import { DocumentWorkspace } from './DocumentWorkspace'
import { CopilotDrawer } from './CopilotDrawer'
import { CodingWorkspace } from './CodingWorkspace'
import { SecurityDashboard } from './SecurityDashboard'
import type {
  AppSystemState,
  DocumentResponse,
  KnowledgeStatsResponse,
  WorkflowExecution,
} from '../types'

interface UnifiedStudioProps {
  systemState: AppSystemState
}

export const UnifiedStudio: React.FC<UnifiedStudioProps> = ({ systemState }) => {
  // Top Workflow Mode ('workflow_a' = Compliance / DOCX, 'workflow_b' = Coding / Sandbox, 'security' = Air-Gap & Ledger)
  const [workflowMode, setWorkflowMode] = useState<'workflow_a' | 'workflow_b' | 'security'>('workflow_a')

  // Asset state
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [kbStats, setKbStats] = useState<KnowledgeStatsResponse | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)

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

  // Overlay Modals / Drawers
  const [showSopModal, setShowSopModal] = useState<boolean>(false)
  const [showDocModal, setShowDocModal] = useState<boolean>(false)
  const [showCopilotDrawer, setShowCopilotDrawer] = useState<boolean>(false)

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
    if (activeExecution) {
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
    setErrorMsg('Workflow execution cancelled.')
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

  // Visual Node Definition for Workflow A
  const canvasNodes = [
    {
      id: 'step_extract',
      stepIndex: 0,
      title: '1. Ingest & OCR',
      subtitle: 'PyMuPDF / Ollama Vision',
      icon: FileText,
      color: 'var(--color-accent)',
    },
    {
      id: 'step_router',
      stepIndex: -1, // helper node
      title: '2. Auto-Router',
      subtitle: 'Dynamic Capability Match',
      icon: Cpu,
      color: 'var(--color-info)',
    },
    {
      id: 'step_search_sops',
      stepIndex: 1,
      title: '3. ChromaDB SOP Search',
      subtitle: 'nomic-embed-text (768-dim)',
      icon: Database,
      color: 'var(--color-info)',
    },
    {
      id: 'step_audit',
      stepIndex: 2,
      title: '4. RAG Compliance Audit',
      subtitle: 'Grounded Citation Provenance',
      icon: Search,
      color: 'var(--color-accent)',
    },
    {
      id: 'step_hitl_checkpoint',
      stepIndex: 3,
      title: '5. HITL Approval Gate',
      subtitle: 'Mandatory Human Sign-Off',
      icon: AlertTriangle,
      color: 'var(--color-warning)',
    },
    {
      id: 'step_generate_docx',
      stepIndex: 4,
      title: '6. DOCX Export',
      subtitle: 'On-Premise Formal Word Note',
      icon: FileCheck,
      color: 'var(--color-success)',
    },
  ]

  function getNodeStatus(stepIndex: number, nodeId: string) {
    if (!activeExecution) return 'idle'

    if (nodeId === 'step_router') {
      return activeExecution ? 'completed' : 'idle'
    }

    const step = activeExecution.steps[stepIndex]
    if (!step) return 'idle'
    return step.status
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ── Studio Top Status Bar ── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <Zap size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Industrial AI Command Cockpit
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--color-success)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                ● 100% AIR-GAPPED
              </span>
            </div>
            <p style={{ fontSize: '11px', margin: 0, color: 'var(--color-text-muted)' }}>
              {workflowMode === 'workflow_a'
                ? 'Operating Workflow A (Document Compliance Audit & DOCX Generation)'
                : 'Operating Workflow B (Secure Coding Agent, AST Security Guard & Sandbox Runner)'}
            </p>
          </div>
        </div>

        {/* Workflow Mode Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            gap: '3px',
          }}
        >
          <button
            onClick={() => setWorkflowMode('workflow_a')}
            style={{
              background: workflowMode === 'workflow_a' ? 'var(--color-surface)' : 'transparent',
              border: workflowMode === 'workflow_a' ? '1px solid var(--color-border)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: workflowMode === 'workflow_a' ? 700 : 500,
              color: workflowMode === 'workflow_a' ? 'var(--color-accent)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Sliders size={13} />
            <span>Workflow A: Compliance & DOCX</span>
          </button>

          <button
            onClick={() => setWorkflowMode('workflow_b')}
            style={{
              background: workflowMode === 'workflow_b' ? 'var(--color-surface)' : 'transparent',
              border: workflowMode === 'workflow_b' ? '1px solid var(--color-border)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: workflowMode === 'workflow_b' ? 700 : 500,
              color: workflowMode === 'workflow_b' ? 'var(--color-accent)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Code2 size={13} />
            <span>Workflow B: Coding & Sandbox</span>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                background: 'rgba(99, 102, 241, 0.2)',
                padding: '1px 5px',
                borderRadius: '8px',
                color: 'var(--color-accent)',
              }}
            >
              PHASE 5
            </span>
          </button>

          <button
            onClick={() => setWorkflowMode('security')}
            style={{
              background: workflowMode === 'security' ? 'var(--color-surface)' : 'transparent',
              border: workflowMode === 'security' ? '1px solid var(--color-border)' : '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: workflowMode === 'security' ? 700 : 500,
              color: workflowMode === 'security' ? 'var(--color-success)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Shield size={13} color="var(--color-success)" />
            <span>Air-Gap & Ledger</span>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.2)',
                padding: '1px 5px',
                borderRadius: '8px',
                color: 'var(--color-success)',
              }}
            >
              PHASE 6
            </span>
          </button>
        </div>

        {/* Quick Tool Triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowSopModal(true)}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Database size={13} color="var(--color-accent)" />
            SOP Library ({kbStats?.total_documents ?? 0} docs)
          </button>

          <button
            onClick={() => setShowDocModal(true)}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={13} color="var(--color-accent)" />
            Document Inspector ({documents.length})
          </button>

          <button
            onClick={() => setShowCopilotDrawer(true)}
            style={{
              background: showCopilotDrawer ? 'var(--color-accent)' : 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: showCopilotDrawer ? '#fff' : 'var(--color-text-primary)',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MessageSquare size={13} />
            AI Copilot
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--color-danger)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={15} />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--color-success)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={15} />
          {successMsg}
        </div>
      )}

      {/* ── Workflow Views ── */}
      <div style={{ display: workflowMode === 'security' ? 'block' : 'none' }}>
        <SecurityDashboard
          systemState={systemState}
          onClose={() => setWorkflowMode('workflow_a')}
        />
      </div>

      <div style={{ display: workflowMode === 'workflow_b' ? 'block' : 'none' }}>
        <CodingWorkspace
          systemState={systemState}
          onSwitchToWorkflowA={() => setWorkflowMode('workflow_a')}
        />
      </div>

      <div
        style={{
          display: workflowMode === 'workflow_a' ? 'grid' : 'none',
          gridTemplateColumns: '260px 1fr 340px',
          gap: '16px',
          minHeight: '620px',
          alignItems: 'stretch',
        }}
      >
        
        {/* ── LEFT PANEL: Asset & Tool Navigator ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Section: Inspection Reports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Inspection Assets
              </span>
              <label
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <UploadCloud size={12} /> Upload
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={handleQuickUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {documents.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>
                  No documents found.
                </div>
              ) : (
                documents.map((d) => {
                  const isSelected = d.id === selectedDocId
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        if (isRunning) {
                          handleResetStudio()
                        } else {
                          setActiveExecution(null)
                        }
                        setSelectedDocId(d.id)
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-bg)',
                        border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '160px',
                          }}
                        >
                          {d.filename}
                        </span>
                        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                          {d.file_type.toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {(d.size_bytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Section: SOP Knowledge Base */}
          <div
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Database size={12} color="var(--color-info)" /> ChromaDB SOPs
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 700 }}>
                {kbStats?.total_chunks ?? 0} chunks
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
              Primary Standard: <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>SOP-REF-570</span>
            </div>
            <button
              onClick={() => setShowSopModal(true)}
              style={{
                marginTop: '4px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
                fontSize: '10px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Open Full SOP Repository ↗
            </button>
          </div>

          {/* Section: Model Auto-Router Engine */}
          <div
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Cpu size={12} color="var(--color-success)" /> Active Model Layer
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Reasoning & LLM:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-teal)' }}>{systemState.modelHealth?.default_model || 'qwen2.5-coder:1.5b'}</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Dense Vector:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>nomic-embed</span>
            </div>
          </div>

          {/* Section: Execution Sessions */}
          {executions.length > 0 && (
            <div
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  Recent Sessions ({executions.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '80px', overflowY: 'auto' }}>
                {executions.slice(0, 3).map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => setActiveExecution(ex)}
                    style={{
                      padding: '4px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: activeExecution?.id === ex.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: activeExecution?.id === ex.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                      cursor: 'pointer',
                      fontSize: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      {ex.document_name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: ex.status === 'completed' ? 'var(--color-success)' : ex.status === 'waiting_for_approval' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                      {ex.status.slice(0, 6).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Workflow B Quick Switch */}
          <div
            onClick={() => setWorkflowMode('workflow_b')}
            style={{
              marginTop: 'auto',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={16} color="var(--color-accent)" />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Coding Agent & Sandbox</div>
                <div style={{ fontSize: '9px', color: 'var(--color-accent)' }}>Workflow B · Phase 5 Ready</div>
              </div>
            </div>
            <ChevronRight size={14} color="var(--color-text-muted)" />
          </div>

        </div>

        {/* ── CENTER PANEL: Visual Workflow Canvas ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
          }}
        >
          {/* Canvas Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={15} color="var(--color-accent)" />
                Workflow A Execution Graph
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Target: {selectedDoc ? selectedDoc.filename : 'No document selected'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isRunning ? (
                <button
                  onClick={handleCancelWorkflow}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--color-danger)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={12} /> Cancel Audit
                </button>
              ) : activeExecution ? (
                <button
                  onClick={handleResetStudio}
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={11} /> New Audit
                </button>
              ) : null}
              {activeExecution && (
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  Session: {activeExecution.id.slice(0, 8)}...
                </div>
              )}
            </div>
          </div>

          {/* Canvas Nodes Flow Grid */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              gap: '12px',
              padding: '8px 0',
            }}
          >
            {canvasNodes.map((node, idx) => {
              const status = getNodeStatus(node.stepIndex, node.id)
              const isWaiting = status === 'waiting_approval'
              const isNodeRunning = status === 'running'
              const isNodeDone = status === 'completed'
              const isSelected = selectedNodeIndex === idx

              return (
                <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Connector Line from previous node */}
                  {idx > 0 && (
                    <div
                      style={{
                        width: '2px',
                        height: '14px',
                        background: isNodeDone || isNodeRunning || isWaiting
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                        marginBottom: '4px',
                        transition: 'background var(--transition-fast)',
                      }}
                    />
                  )}

                  {/* Node Card */}
                  <div
                    onClick={() => setSelectedNodeIndex(idx)}
                    className={isWaiting ? 'pulse-amber' : ''}
                    style={{
                      width: '100%',
                      background: isWaiting
                        ? 'rgba(245, 158, 11, 0.08)'
                        : isNodeRunning
                        ? 'rgba(99, 102, 241, 0.08)'
                        : isNodeDone
                        ? 'var(--color-bg)'
                        : 'var(--color-surface-2)',
                      border: isWaiting
                        ? '1px solid var(--color-warning)'
                        : isSelected
                        ? '1px solid #818cf8'
                        : isNodeRunning
                        ? '1px solid var(--color-accent)'
                        : isNodeDone
                        ? '1px solid var(--color-border)'
                        : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: node.color,
                        }}
                      >
                        <node.icon size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {node.title}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                          {node.subtitle}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isNodeDone ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} /> DONE
                        </span>
                      ) : isNodeRunning ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <RotateCw size={12} className="spin-animation" /> RUNNING
                        </span>
                      ) : isWaiting ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> PAUSED FOR SIGN-OFF
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          IDLE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL: Context & HITL Action Panel ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* HITL State: WAITING FOR APPROVAL */}
          {activeExecution && activeExecution.status === 'waiting_for_approval' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                <AlertTriangle size={18} color="var(--color-warning)" />
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-warning)' }}>
                    Human Sign-Off Checkpoint
                  </h4>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    Step 5 Paused · Review & Approve
                  </span>
                </div>
              </div>

              {/* Findings preview */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Extracted Findings & SOP Citations:
                </label>
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    maxHeight: '110px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {activeExecution.audit_analysis || activeExecution.extracted_text}
                </div>
              </div>

              {/* Editable Recommendations */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-warning)' }}>
                  Mandated Remediation (Editable):
                </label>
                <textarea
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    height: '55px',
                    background: 'var(--color-bg)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: 'var(--color-text-primary)',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 8px',
                    outline: 'none',
                    resize: 'none',
                  }}
                  value={editedRecommendations}
                  onChange={(e) => setEditedRecommendations(e.target.value)}
                />
              </div>

              {/* Reviewer Sign-Off Remarks */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Reviewer Authority & Remarks:
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
                    padding: '6px 8px',
                    outline: 'none',
                  }}
                  placeholder="e.g. Approved for immediate outage window."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                />
              </div>

              {/* Approve & Reject Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                <button
                  onClick={() => handleApprovalDecision('approve')}
                  disabled={isSubmittingApproval}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: isSubmittingApproval ? 'not-allowed' : 'pointer',
                    background: 'var(--color-success)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {isSubmittingApproval ? <RotateCw size={13} className="spin-animation" /> : <Check size={13} />}
                  Approve & Generate DOCX
                </button>

                <button
                  onClick={() => handleApprovalDecision('reject')}
                  disabled={isSubmittingApproval}
                  style={{
                    width: '100%',
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-danger)',
                    cursor: isSubmittingApproval ? 'not-allowed' : 'pointer',
                    background: 'transparent',
                    color: 'var(--color-danger)',
                  }}
                >
                  ✕ Reject Audit
                </button>
              </div>
            </div>
          ) : activeExecution && activeExecution.status === 'completed' ? (
            /* Completed State with DOCX download */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                <FileCheck size={18} color="var(--color-success)" />
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-success)' }}>
                    Compliance Note Ready
                  </h4>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    Execution Approved & Compiled
                  </span>
                </div>
              </div>

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
                <span style={{ color: 'var(--color-text-muted)' }}>Artifact File:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                  {activeExecution.artifact_filename || 'Approval_Note.docx'}
                </span>
              </div>

              <a
                href={getArtifactDownloadUrl(activeExecution.id)}
                download
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-success)',
                  color: '#fff',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Download size={14} /> Download .DOCX Note
              </a>

              <button
                onClick={() => {
                  setActiveExecution(null)
                  setEditedRecommendations('')
                  setReviewerNotes('')
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <RotateCcw size={12} /> Start Another Audit
              </button>
            </div>
          ) : (
            /* Pre-Execution Launch Configuration */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                  Workflow A Configuration
                </h4>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  Autonomous Compliance Pipeline
                </span>
              </div>

              {/* Target Document Selected */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Target Report:
                </label>
                <div
                  style={{
                    marginTop: '4px',
                    padding: '6px 8px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedDoc ? selectedDoc.filename : 'None selected'}
                  </span>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                    {selectedDoc?.file_type.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Directive */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Directive / Scope (Optional):
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
                    padding: '6px 8px',
                    outline: 'none',
                    resize: 'none',
                  }}
                  placeholder="e.g. Cross-reference pipe wall thickness with SOP-REF-570..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              {/* Human Approver Authority */}
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Approver Authority:
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
                    padding: '6px 8px',
                    outline: 'none',
                  }}
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              {/* Launch Button */}
              <button
                onClick={handleLaunchWorkflow}
                disabled={isRunning || !selectedDocId}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: isRunning || !selectedDocId ? 'not-allowed' : 'pointer',
                  background: isRunning ? 'rgba(99, 102, 241, 0.4)' : 'var(--color-accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: isRunning ? 'none' : '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                {isRunning ? (
                  <>
                    <RotateCw size={13} className="spin-animation" /> Running Workflow A...
                  </>
                ) : (
                  <>
                    <Play size={13} /> Run Autonomous Workflow A
                  </>
                )}
              </button>

              {isRunning && (
                <button
                  onClick={handleCancelWorkflow}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-danger)',
                    background: 'transparent',
                    color: 'var(--color-danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <X size={13} /> Cancel Running Workflow
                </button>
              )}
            </div>
          )}
        </div>
      </div>



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

      {/* ── AI COPILOT SLIDE-OUT DRAWER ── */}
      <CopilotDrawer
        isOpen={showCopilotDrawer}
        onClose={() => setShowCopilotDrawer(false)}
        systemState={systemState}
      />

    </div>
  )
}
