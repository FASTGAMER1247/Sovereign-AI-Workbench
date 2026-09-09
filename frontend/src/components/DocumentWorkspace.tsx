import { useState, useEffect, useCallback, useRef, DragEvent, ChangeEvent } from 'react'
import {
  FileText,
  Upload,
  FileCode,
  Image as ImageIcon,
  Clock,
  Cpu,
  Loader2,
  RefreshCw,
  Eye,
  Brain,
  Sparkles,
  ArrowRight,
  Database,
  BookOpen,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  extractDocumentText,
  analyzeDocument,
  ragAuditDocument,
  ingestKnowledge,
} from '../api/client'
import type {
  DocumentResponse,
  DocumentExtractionResponse,
  DocumentAnalysisResponse,
  RAGAuditResponse,
  AppSystemState,
} from '../types'

interface DocumentWorkspaceProps {
  systemState: AppSystemState
}

export function DocumentWorkspace({ systemState }: DocumentWorkspaceProps) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Document Content & Analysis state
  const [extractedData, setExtractedData] = useState<DocumentExtractionResponse | null>(null)
  const [analysisData, setAnalysisData] = useState<DocumentAnalysisResponse | null>(null)
  const [ragAuditData, setRagAuditData] = useState<RAGAuditResponse | null>(null)
  const [isRagAuditing, setIsRagAuditing] = useState(false)
  const [isIndexingToKB, setIsIndexingToKB] = useState(false)
  const [kbIndexSuccess, setKbIndexSuccess] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [activeViewTab, setActiveViewTab] = useState<'content' | 'analysis'>('content')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch document list
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const docs = await getDocuments()
      setDocuments(docs)
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents'
      console.error(msg)
    } finally {
      setIsLoadingDocs(false)
    }
  }, [selectedDocId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Current selected document
  const selectedDoc = documents.find(d => d.id === selectedDocId) || null

  // Clear sub-state when changing selected document
  useEffect(() => {
    setExtractedData(null)
    setAnalysisData(null)
    setRagAuditData(null)
    setKbIndexSuccess(null)
    setActionError(null)
    setCustomPrompt('')
    setActiveViewTab('content')
  }, [selectedDocId])

  // Handle file upload
  const handleUploadFile = async (file: File) => {
    setUploadError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadDocument(file)
      await fetchDocuments()
      setSelectedDocId(uploaded.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploadError(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFile(e.target.files[0])
    }
  }

  const handleDeleteDoc = async (docId: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return
    try {
      await deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      if (selectedDocId === docId) {
        setSelectedDocId(null)
        setExtractedData(null)
        setAnalysisData(null)
        setRagAuditData(null)
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0])
    }
  }

  // Handle Text Extraction
  const handleExtract = async () => {
    if (!selectedDoc) return
    setIsExtracting(true)
    setActionError(null)
    try {
      const res = await extractDocumentText(selectedDoc.id)
      setExtractedData(res)
      setActiveViewTab('content')
      // Refresh doc status in list
      fetchDocuments()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Text extraction failed'
      setActionError(msg)
    } finally {
      setIsExtracting(false)
    }
  }

  // Handle AI Analysis
  const handleAnalyze = async (promptOverride?: string) => {
    if (!selectedDoc) return
    setIsAnalyzing(true)
    setActionError(null)
    setRagAuditData(null)
    const promptToUse = promptOverride !== undefined ? promptOverride : customPrompt
    try {
      const res = await analyzeDocument(selectedDoc.id, {
        prompt: promptToUse || undefined,
        model: systemState.modelHealth?.default_model,
      })
      setAnalysisData(res)
      setActiveViewTab('analysis')
      fetchDocuments()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document analysis failed'
      setActionError(msg)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle RAG-Grounded AI Compliance Audit
  const handleRagAudit = async (promptOverride?: string) => {
    if (!selectedDoc) return
    setIsRagAuditing(true)
    setActionError(null)
    const promptToUse = promptOverride !== undefined ? promptOverride : customPrompt
    try {
      const res = await ragAuditDocument(selectedDoc.id, {
        prompt: promptToUse || undefined,
        model: systemState.modelHealth?.default_model,
        top_k_standards: 4,
      })
      setRagAuditData(res)
      setAnalysisData({
        document_id: res.document_id,
        filename: res.filename,
        analysis: res.analysis,
        model: res.model,
        provider: res.provider,
        duration_ms: res.duration_ms,
        prompt_tokens: res.prompt_tokens,
        completion_tokens: res.completion_tokens,
        created_at: res.created_at,
      })
      setActiveViewTab('analysis')
      fetchDocuments()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'RAG Grounded Audit failed'
      setActionError(msg)
    } finally {
      setIsRagAuditing(false)
    }
  }

  // Handle Ingesting Document into Knowledge Base
  const handleIndexToKB = async () => {
    if (!selectedDoc) return
    setIsIndexingToKB(true)
    setActionError(null)
    setKbIndexSuccess(null)
    try {
      const res = await ingestKnowledge({ document_id: selectedDoc.id })
      setKbIndexSuccess(`Indexed into Knowledge Base (${res.total_chunks} chunks).`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Indexing to Knowledge Base failed'
      setActionError(msg)
    } finally {
      setIsIndexingToKB(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getFileIcon = (fileType: string) => {
    const ft = fileType.toLowerCase()
    if (ft === 'pdf') return <FileText size={16} color="var(--color-accent)" />
    if (['png', 'jpg', 'jpeg'].includes(ft)) return <ImageIcon size={16} color="var(--color-warning)" />
    return <FileCode size={16} color="var(--color-text-secondary)" />
  }

  const isModelOnline = systemState.backendStatus === 'online' && systemState.modelStatus === 'online'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', minHeight: '600px' }}>
      {/* ——— LEFT PANEL: Ingestion & Document List ——— */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Upload Zone */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Document Ingestion</span>
            <span className="text-xs text-mono text-muted">MAX 50MB</span>
          </div>
          <div className="card-body">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${isDragOver ? 'var(--color-accent)' : 'var(--color-border-2)'}`,
                background: isDragOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5) var(--space-4)',
                textAlign: 'center',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={24} color="var(--color-accent)" style={{ animation: 'spin 0.7s linear infinite' }} />
                  <span className="text-sm font-medium">Validating & Ingesting...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Upload size={22} color="var(--color-text-secondary)" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Drop PDF Document here
                  </span>
                  <span className="text-xs text-muted">Supports .pdf (primary format) or .docx</span>
                </div>
              )}
            </div>

            {uploadError && (
              <div style={{ marginTop: '10px' }}>
                <span className="response-error" style={{ display: 'block', fontSize: '11px', padding: '8px' }}>
                  {uploadError}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Document Registry List */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <span className="card-title">Local Registry ({documents.length})</span>
            <button
              className="btn btn-ghost"
              onClick={fetchDocuments}
              disabled={isLoadingDocs}
              title="Refresh document list"
              style={{ padding: '3px 6px', fontSize: '11px' }}
            >
              <RefreshCw size={11} style={{ animation: isLoadingDocs ? 'spin 0.7s linear infinite' : 'none' }} />
            </button>
          </div>

          <div style={{ padding: '8px', overflowY: 'auto', maxHeight: '420px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {documents.length === 0 && !isLoadingDocs && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                No documents ingested yet. Upload an inspection PDF or technical drawing to start.
              </div>
            )}

            {documents.map(doc => {
              const isSelected = doc.id === selectedDocId
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--color-surface-2)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--color-border-2)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      {getFileIcon(doc.file_type)}
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '180px',
                        }}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 5px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          background:
                            doc.status === 'analyzed'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : doc.status === 'extracted'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color:
                            doc.status === 'analyzed'
                              ? 'var(--color-success)'
                              : doc.status === 'extracted'
                              ? 'var(--color-info)'
                              : 'var(--color-text-muted)',
                        }}
                      >
                        {doc.status}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteDoc(doc.id, doc.filename, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.6,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.color = 'var(--color-danger)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.6'
                          e.currentTarget.style.color = 'var(--color-text-muted)'
                        }}
                        title={`Delete ${doc.filename}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>{formatFileSize(doc.size_bytes)}</span>
                    <span>{new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ——— RIGHT PANEL: Document Inspector & AI Analysis ——— */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {selectedDoc ? (
          <>
            {/* Header / Actions Card */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {getFileIcon(selectedDoc.file_type)}
                  <div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedDoc.filename}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      <span>TYPE: {selectedDoc.file_type.toUpperCase()}</span>
                      <span>SIZE: {formatFileSize(selectedDoc.size_bytes)}</span>
                      <span>ID: {selectedDoc.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost"
                    onClick={handleExtract}
                    disabled={isExtracting || isAnalyzing || isRagAuditing}
                    title="Extract text or OCR transcript locally"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Eye size={12} />
                        Extract Text
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={handleIndexToKB}
                    disabled={isIndexingToKB || isExtracting}
                    title="Index this document into the Knowledge Base vector store"
                    style={{ fontSize: '12px', padding: '6px 10px', color: 'var(--color-accent)' }}
                  >
                    {isIndexingToKB ? (
                      <>
                        <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                        Indexing...
                      </>
                    ) : (
                      <>
                        <Database size={12} />
                        Index to KB
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => handleAnalyze()}
                    disabled={isExtracting || isAnalyzing || isRagAuditing || !isModelOnline}
                    title="Run standard on-premise AI analysis"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                        Auditing...
                      </>
                    ) : (
                      <>
                        <Brain size={12} />
                        Standard Audit
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleRagAudit()}
                    disabled={isExtracting || isAnalyzing || isRagAuditing || !isModelOnline}
                    title="Run RAG compliance audit cross-referencing organizational standards"
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      background: 'linear-gradient(135deg, var(--color-accent) 0%, #2563eb 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    {isRagAuditing ? (
                      <>
                        <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                        Grounding with SOPs...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={13} />
                        RAG Grounded Audit
                      </>
                    )}
                  </button>
                </div>
              </div>

              {kbIndexSuccess && (
                <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={13} color="var(--color-success)" />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>{kbIndexSuccess}</span>
                </div>
              )}

              {actionError && (
                <div style={{ padding: '10px 20px', background: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <span className="text-xs text-danger text-mono">{actionError}</span>
                </div>
              )}

              {/* View Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                <button
                  onClick={() => setActiveViewTab('content')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: activeViewTab === 'content' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    background: activeViewTab === 'content' ? 'var(--color-surface)' : 'transparent',
                    border: 'none',
                    borderBottom: activeViewTab === 'content' ? '2px solid var(--color-accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={13} />
                  Extracted Content
                  {extractedData && <span style={{ fontSize: '10px', color: 'var(--color-success)' }}>•</span>}
                </button>

                <button
                  onClick={() => setActiveViewTab('analysis')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: activeViewTab === 'analysis' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    background: activeViewTab === 'analysis' ? 'var(--color-surface)' : 'transparent',
                    border: 'none',
                    borderBottom: activeViewTab === 'analysis' ? '2px solid var(--color-accent)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={13} />
                  AI Audit Findings
                  {analysisData && <span style={{ fontSize: '10px', color: 'var(--color-success)' }}>•</span>}
                </button>
              </div>

              {/* Tab Content */}
              <div className="card-body" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
                {activeViewTab === 'content' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                    {extractedData ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          <span>METHOD: {extractedData.method.toUpperCase()}</span>
                          <span>LENGTH: {extractedData.char_count} chars</span>
                        </div>
                        <div
                          style={{
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border-2)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-4)',
                            fontSize: '13px',
                            fontFamily: 'var(--font-mono)',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            overflowY: 'auto',
                            maxHeight: '340px',
                            flex: 1,
                          }}
                        >
                          {extractedData.extracted_text}
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-text-muted)' }}>
                        <FileText size={32} opacity={0.4} />
                        <div style={{ textAlign: 'center' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            No extracted content loaded yet
                          </p>
                          <p className="text-xs">
                            Click <strong>Extract Text</strong> to parse PDF content via PyMuPDF or transcribe images via Ollama Vision.
                          </p>
                        </div>
                        <button className="btn btn-ghost" onClick={handleExtract} disabled={isExtracting} style={{ fontSize: '12px' }}>
                          Extract Now
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeViewTab === 'analysis' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
                    {/* Prompt Presets / Custom Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="text-xs text-muted" style={{ alignSelf: 'center', marginRight: '4px' }}>
                          Templates:
                        </span>
                        {[
                          'Risk & Safety Audit',
                          'Key Technical Findings',
                          'Actionable Recommendations',
                        ].map(t => (
                          <button
                            key={t}
                            className="btn btn-ghost"
                            onClick={() => {
                              setCustomPrompt(`Perform a detailed ${t} on this document. Outline critical observations and prioritized steps.`)
                              handleAnalyze(`Perform a detailed ${t} on this document. Outline critical observations and prioritized steps.`)
                            }}
                            disabled={isAnalyzing || !isModelOnline}
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="prompt-textarea"
                          value={customPrompt}
                          onChange={e => setCustomPrompt(e.target.value)}
                          placeholder="Custom auditor prompt (e.g. 'Identify all pressure ratings and inspection dates')..."
                          style={{ minHeight: '38px', padding: '8px 12px', fontSize: '12px' }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleAnalyze()
                            }
                          }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => handleAnalyze()}
                          disabled={isAnalyzing || !isModelOnline}
                          style={{ padding: '0 14px', fontSize: '12px', gap: '4px' }}
                        >
                          <ArrowRight size={13} />
                          Run
                        </button>
                      </div>
                    </div>

                    {/* AI Analysis View */}
                    {analysisData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                        <div
                          style={{
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border-2)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-4)',
                            fontSize: '13px',
                            lineHeight: '1.7',
                            whiteSpace: 'pre-wrap',
                            overflowY: 'auto',
                            maxHeight: '260px',
                            flex: 1,
                          }}
                        >
                          {analysisData.analysis}
                        </div>

                        {/* RAG Grounded Citations Section */}
                        {ragAuditData && ragAuditData.grounded_citations.length > 0 && (
                          <div
                            style={{
                              background: 'var(--color-surface-2)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
                                <BookOpen size={14} />
                                Grounded SOP & Standard Citations ({ragAuditData.grounded_citations.length})
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 600 }}>
                                100% LOCAL VECTOR GROUNDING
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                              {ragAuditData.grounded_citations.map((cite, cIdx) => {
                                const pct = Math.round(cite.similarity_score * 100)
                                return (
                                  <div
                                    key={cIdx}
                                    style={{
                                      background: 'var(--color-bg)',
                                      border: '1px solid var(--color-border-2)',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '8px 10px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        {cite.document_name}
                                      </span>
                                      <span
                                        style={{
                                          background: 'rgba(59, 130, 246, 0.1)',
                                          color: 'var(--color-accent)',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          fontWeight: 700,
                                          fontSize: '10px',
                                        }}
                                      >
                                        {pct}% Match
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                                      {cite.page_number ? `Page ${cite.page_number}` : 'Standard Reference'} • Chunk #{cite.chunk_index + 1}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.4, fontStyle: 'italic', background: 'var(--color-surface)', padding: '4px 6px', borderRadius: '2px' }}>
                                      "{cite.excerpt}"
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Analysis Metrics */}
                        <div className="response-meta-bar" style={{ borderRadius: 'var(--radius-md)' }}>
                          <div className="response-meta-item">
                            <Cpu size={11} />
                            <span>Model:</span>
                            <span>{analysisData.model}</span>
                          </div>
                          {analysisData.duration_ms !== undefined && (
                            <div className="response-meta-item">
                              <Clock size={11} />
                              <span>Duration:</span>
                              <span>{(analysisData.duration_ms / 1000).toFixed(2)}s</span>
                            </div>
                          )}
                          {analysisData.completion_tokens !== undefined && (
                            <div className="response-meta-item">
                              <span>Tokens:</span>
                              <span>
                                {analysisData.prompt_tokens ?? '?'} prompt + {analysisData.completion_tokens} completion
                              </span>
                            </div>
                          )}
                          <div className="response-meta-item" style={{ marginLeft: 'auto' }}>
                            <span style={{ color: 'var(--color-sovereign)' }}>
                              {ragAuditData ? '• RAG-GROUNDED COMPLIANCE AUDIT' : '• LOCAL OLLAMA INFERENCE'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : isAnalyzing || isRagAuditing ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--color-accent)' }}>
                        <Loader2 size={28} style={{ animation: 'spin 0.7s linear infinite' }} />
                        <span className="text-sm font-medium">
                          {isRagAuditing ? 'Cross-referencing local SOP vector store & generating compliance audit...' : 'Running local AI audit...'}
                        </span>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                        <Sparkles size={32} opacity={0.4} />
                        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          Ready for Local AI Document Audit
                        </span>
                        <span className="text-xs">
                          Select a template above or click <strong>RAG Grounded Audit</strong> to cross-reference organizational standards.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <FileText size={48} opacity={0.2} />
            <h3 className="text-sm font-semibold" style={{ marginTop: '16px', color: 'var(--color-text-secondary)' }}>
              No Document Selected
            </h3>
            <p className="text-xs text-muted" style={{ marginTop: '4px', textAlign: 'center', maxWidth: '300px' }}>
              Upload an industrial document (PDF or image) from the left panel or select an existing document to view and audit.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
