import React, { useState, useEffect, useCallback } from 'react'
import {
  Database,
  Search,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  BookOpen,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  getKnowledgeDocuments,
  getKnowledgeDocumentChunks,
  deleteKnowledgeDocument,
  queryKnowledgeBase,
  getKnowledgeStats,
  ingestKnowledge,
  getDocuments,
} from '../api/client'
import type {
  AppSystemState,
  DocumentResponse,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeQueryResponse,
  KnowledgeStatsResponse,
} from '../types'

interface KnowledgeWorkspaceProps {
  systemState: AppSystemState
}

export const KnowledgeWorkspace: React.FC<KnowledgeWorkspaceProps> = ({ systemState: _systemState }) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<DocumentResponse[]>([])
  const [stats, setStats] = useState<KnowledgeStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Ingestion Modal State
  const [showIngestModal, setShowIngestModal] = useState(false)
  const [ingestMode, setIngestMode] = useState<'from_uploaded' | 'manual_text'>('from_uploaded')
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualContent, setManualContent] = useState('')
  const [manualCategory, setManualCategory] = useState('Safety & Integrity SOP')
  const [isIngesting, setIsIngesting] = useState(false)

  // Chunk Inspector Modal
  const [inspectingDoc, setInspectingDoc] = useState<KnowledgeDocument | null>(null)
  const [inspectingChunks, setInspectingChunks] = useState<KnowledgeChunk[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)

  // Query Playground State
  const [searchQuery, setSearchQuery] = useState('')
  const [topK, setTopK] = useState(4)
  const [isSearching, setIsSearching] = useState(false)
  const [queryResult, setQueryResult] = useState<KnowledgeQueryResponse | null>(null)

  const loadKBData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [docs, kStats, allDocs] = await Promise.all([
        getKnowledgeDocuments(),
        getKnowledgeStats().catch(() => null),
        getDocuments().catch(() => []),
      ])
      setDocuments(docs)
      setStats(kStats)
      setUploadedDocs(allDocs)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load Knowledge Base data.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKBData()
  }, [loadKBData])

  // Handle Manual or Document Ingestion
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsIngesting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (ingestMode === 'from_uploaded') {
        if (!selectedDocId) {
          throw new Error('Please select an uploaded document to index.')
        }
        const res = await ingestKnowledge({
          document_id: selectedDocId,
          metadata: { source: 'document_registry' },
        })
        setSuccessMessage(res.message)
      } else {
        if (!manualTitle.trim() || !manualContent.trim()) {
          throw new Error('Title and content are required for manual standard entry.')
        }
        const res = await ingestKnowledge({
          title: manualTitle.trim(),
          content: manualContent.trim(),
          metadata: { category: manualCategory, source: 'manual_entry' },
        })
        setSuccessMessage(res.message)
        setManualTitle('')
        setManualContent('')
      }
      setShowIngestModal(false)
      await loadKBData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ingestion failed.'
      setError(msg)
    } finally {
      setIsIngesting(false)
    }
  }

  // Handle Document Delete
  const handleDelete = async (docId: string, filename: string) => {
    if (!window.confirm(`Remove '${filename}' and all its vector embeddings from the Knowledge Base?`)) {
      return
    }
    try {
      await deleteKnowledgeDocument(docId)
      setSuccessMessage(`Document '${filename}' deleted from Knowledge Base.`)
      await loadKBData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete knowledge document.'
      setError(msg)
    }
  }

  // Handle Chunk Inspection
  const handleInspectChunks = async (doc: KnowledgeDocument) => {
    setInspectingDoc(doc)
    setIsLoadingChunks(true)
    try {
      const chunks = await getKnowledgeDocumentChunks(doc.id)
      setInspectingChunks(chunks)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load document chunks.'
      setError(msg)
    } finally {
      setIsLoadingChunks(false)
    }
  }

  // Filter SOPs
  const [sopFilter, setSopFilter] = useState('')

  // Handle Semantic Query Execution
  const executeSearch = async (queryText: string) => {
    const q = queryText.trim()
    if (!q) return

    setIsSearching(true)
    setError(null)
    try {
      const res = await queryKnowledgeBase({
        query: q,
        top_k: topK,
        similarity_threshold: 0.0,
      })
      setQueryResult(res)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Semantic search failed.'
      setError(msg)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(searchQuery)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / Knowledge Base Telemetry */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}
          >
            <Database size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Air-Gapped Organizational Knowledge Base (RAG)
            </h2>
            <p style={{ fontSize: '12px', margin: '3px 0 0 0', color: 'var(--color-text-muted)' }}>
              100% On-Premise Vector Store. Grounding engineering compliance in internal SOPs, API/ASME standards & manuals.
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Indexed Docs
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {stats?.total_documents ?? documents.length}
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', background: 'var(--color-border)' }} />

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vector Chunks
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-accent)' }}>
              {stats?.total_chunks ?? 0}
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', background: 'var(--color-border)' }} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-success)',
            }}
          >
            <ShieldCheck size={14} />
            0 B Egress / Air-Gapped
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--color-error)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {successMessage && (
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
          {successMessage}
        </div>
      )}

      {/* ── 2. PROMINENT RAG SEARCH BAR ── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--color-accent)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Search RAG Knowledge Base (ChromaDB)
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Nomic Embed Text · Dense Vector Retrieval
          </span>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all indexed SOPs, safety standards, API 570 limits, and dense vector chunks..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim() || documents.length === 0}
            className="btn btn-primary"
            style={{
              padding: '0 20px',
              height: '42px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            {isSearching ? <RefreshCw size={14} className="spinning" /> : <Search size={14} />}
            <span>Search RAG</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Suggested queries:</span>
          {[
            'API 570 minimum wall thickness',
            'SOP-REF-570 hydrocarbon piping',
            'Corrosion rate allowance formula',
            'Hydrostatic pressure test requirements',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setSearchQuery(prompt)
                executeSearch(prompt)
              }}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
            >
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Indexed Standards & SOPs */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="var(--color-accent)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                Organizational Standards & SOPs
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={loadKBData}
                disabled={isLoading}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Refresh Standards"
              >
                <RefreshCw size={13} className={isLoading ? 'spinning' : ''} />
              </button>

              <button
                onClick={() => setShowIngestModal(true)}
                style={{
                  background: 'var(--color-accent)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} />
                Index New Standard
              </button>
            </div>
          </div>

          {/* Quick Filter Bar for Indexed Standards */}
          {documents.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }}
              />
              <input
                type="text"
                value={sopFilter}
                onChange={(e) => setSopFilter(e.target.value)}
                placeholder="Filter indexed SOPs by title or category..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11.5px',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* List of Indexed Standards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px' }}>
            {isLoading && documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                Loading local vector store...
              </div>
            ) : documents.length === 0 ? (
              <div
                style={{
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Database size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>No Standards Indexed Yet</p>
                <p style={{ margin: '4px 0 14px 0', fontSize: '11px' }}>
                  Index organizational SOPs, ASME/API engineering codes, or safety procedures for RAG grounding.
                </p>
                <button
                  onClick={() => setShowIngestModal(true)}
                  style={{
                    background: 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add Standard / SOP
                </button>
              </div>
            ) : (
              documents
                .filter((doc) =>
                  !sopFilter.trim() ||
                  doc.filename.toLowerCase().includes(sopFilter.toLowerCase()) ||
                  (doc.metadata && typeof doc.metadata.category === 'string' && doc.metadata.category.toLowerCase().includes(sopFilter.toLowerCase()))
                )
                .map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} color="var(--color-accent)" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {doc.filename}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleInspectChunks(doc)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Layers size={11} />
                        Chunks
                      </button>

                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-error)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remove from Knowledge Base"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    <span
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--color-accent)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontWeight: 600,
                      }}
                    >
                      {doc.total_chunks} {doc.total_chunks === 1 ? 'chunk' : 'chunks'}
                    </span>

                    <span>Type: {doc.file_type.toUpperCase()}</span>
                    <span>Indexed: {new Date(doc.indexed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Semantic Search Playground & Citations Inspector */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--color-accent)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
              Semantic Retrieval & Grounding Inspector
            </h3>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., What are the wall thinning limits for carbon steel line 102?"
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim() || documents.length === 0}
                style={{
                  background: 'var(--color-accent)',
                  border: 'none',
                  color: '#fff',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isSearching || !searchQuery.trim() || documents.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: isSearching || !searchQuery.trim() || documents.length === 0 ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSearching ? <RefreshCw size={13} className="spinning" /> : <Search size={14} />}
                Search
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <span>Local Cosine Similarity Retrieval</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Top-K Chunks:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <option value={2}>2 chunks</option>
                  <option value={4}>4 chunks</option>
                  <option value={6}>6 chunks</option>
                  <option value={8}>8 chunks</option>
                </select>
              </div>
            </div>
          </form>

          {/* Results Area */}
          <div style={{ minHeight: '260px' }}>
            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                <RefreshCw size={20} className="spinning" style={{ marginBottom: '8px', opacity: 0.6 }} />
                <div>Embedding query and ranking vector cosine distances locally...</div>
              </div>
            ) : queryResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <span>
                    Matched <strong>{queryResult.total_matched}</strong> relevant chunks
                  </span>
                  <span>Execution Time: {queryResult.query_time_ms} ms</span>
                </div>

                {queryResult.results.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    No chunks exceeded the similarity threshold for this query.
                  </div>
                ) : (
                  queryResult.results.map((res, idx) => {
                    const pct = Math.round(res.similarity_score * 100)
                    return (
                      <div
                        key={res.chunk.id}
                        style={{
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              {res.chunk.filename}
                            </span>
                            {res.chunk.page_number && (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Page {res.chunk.page_number}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '50px',
                                height: '5px',
                                background: 'var(--color-surface)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(5, pct))}%`,
                                  height: '100%',
                                  background: pct > 40 ? 'var(--color-success)' : pct > 20 ? 'var(--color-warning)' : 'var(--color-accent)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {pct}% Match
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                            lineHeight: 1.5,
                            background: 'var(--color-surface)',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid var(--color-accent)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {res.chunk.content}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12px',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Search size={24} style={{ opacity: 0.3, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Semantic Retrieval Inspector</p>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px' }}>
                  Type a technical question or requirement to inspect how the local RAG engine retrieves and ranks grounded SOP excerpts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Index New Standard */}
      {showIngestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                Index Organizational Standard or SOP
              </h3>
              <button
                onClick={() => setShowIngestModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            {/* Ingestion Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => setIngestMode('from_uploaded')}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: ingestMode === 'from_uploaded' ? 'var(--color-accent)' : 'transparent',
                  color: ingestMode === 'from_uploaded' ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                From Uploaded Document
              </button>

              <button
                type="button"
                onClick={() => setIngestMode('manual_text')}
                style={{
                  flex: 1,
                  padding: '6px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: ingestMode === 'manual_text' ? 'var(--color-accent)' : 'transparent',
                  color: ingestMode === 'manual_text' ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                Direct Text / Code Entry
              </button>
            </div>

            <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ingestMode === 'from_uploaded' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>
                    Select Uploaded Document to Index:
                  </label>
                  {uploadedDocs.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '10px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                      No documents currently uploaded. Upload documents in the <strong>Document Intelligence</strong> tab first, or switch to Direct Text Entry above.
                    </div>
                  ) : (
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-primary)',
                        fontSize: '13px',
                      }}
                    >
                      <option value="">-- Choose document --</option>
                      {uploadedDocs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.filename} ({d.file_type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                      Standard Title / Code:
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g., SOP-REF-570: Piping Wall Thickness Thresholds"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-primary)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                      Standard Category:
                    </label>
                    <input
                      type="text"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      placeholder="e.g., Refinery Piping Code / ASME B31.3"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-primary)',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                      Rules, Thresholds & Content:
                    </label>
                    <textarea
                      rows={6}
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Paste the full text of the engineering standard, safety thresholds, compliance rules, or inspection guidelines..."
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isIngesting || (ingestMode === 'from_uploaded' && !selectedDocId)}
                  style={{
                    background: 'var(--color-accent)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isIngesting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isIngesting ? <RefreshCw size={13} className="spinning" /> : <Plus size={14} />}
                  Chunk & Index into Vector Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chunk Inspector */}
      {inspectingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                  Indexed Vector Chunks: {inspectingDoc.filename}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                  {inspectingDoc.total_chunks} total chunks preserved in local vector store
                </p>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {isLoadingChunks ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  Loading chunk vector metadata...
                </div>
              ) : (
                inspectingChunks.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>Chunk #{c.chunk_index + 1}</span>
                      <span>{c.char_count} characters</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {c.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
