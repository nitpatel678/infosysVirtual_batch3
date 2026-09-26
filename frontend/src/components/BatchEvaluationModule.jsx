import React, { useState, useRef, useEffect } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Scale,
  Search,
  Eye,
  X,
  ArrowRight,
  ExternalLink,
  FileDown,
  GitCompare,
  Zap,
  Sparkles,
} from 'lucide-react'

function safeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback
  const num = Number(val)
  return isNaN(num) ? fallback : num
}

function safeScore(val, digits = 1) {
  if (val === null || val === undefined || val === '') return '—'
  const num = Number(val)
  return isNaN(num) ? '—' : num.toFixed(digits)
}

function safeParseJson(val) {
  if (!val) return {}
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch (e) {
    return {}
  }
}

function safeList(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {}
    return [val]
  }
  return []
}

function getVerdictBadgeClass(verdict) {
  const v = (verdict || '').toLowerCase()
  if (v.includes('pass') && !v.includes('needs') && !v.includes('fail')) return 'badge-verdict-pass'
  if (v.includes('conflict')) return 'badge-verdict-conflict'
  if (v.includes('insufficient') || v.includes('unverified') || v.includes('more info')) return 'badge-verdict-insufficient'
  if (v.includes('needs')) return 'badge-verdict-needs'
  return 'badge-verdict-fail'
}

function getScorePillClass(score) {
  const s = safeNum(score)
  if (s >= 4.0) return 'score-pill-high'
  if (s >= 3.0) return 'score-pill-med'
  return 'score-pill-low'
}

function getScoreColorClass(score) {
  const s = safeNum(score)
  if (s >= 4.0) return 'agent-good'
  if (s >= 3.0) return 'agent-moderate'
  return 'agent-poor'
}

function formatAspectText(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') {
    if (item.aspect && item.explanation) return `${item.aspect}: ${item.explanation}`
    if (item.aspect) return item.aspect
    if (item.point) return item.point
    if (item.description) return item.description
    if (item.reasoning) return item.reasoning
    if (item.statement) return item.statement
    if (item.claim) return item.claim
    const vals = Object.values(item).filter(v => typeof v === 'string' && v.trim())
    if (vals.length > 0) return vals.join(' — ')
  }
  return String(item)
}

class InspectErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('Inspect modal render error caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onClick={this.props.onClose}>
          <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header flex-between">
              <h3 className="modal-title">Record Inspection</h3>
              <button type="button" className="modal-close-btn" onClick={this.props.onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-scroll" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <AlertTriangle size={36} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ color: '#f8fafc', marginBottom: '8px' }}>Detailed breakdown unavailable</h4>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                This record may still be processing or has pending multi-agent evaluation output.
              </p>
            </div>
            <div className="modal-footer flex-between">
              <span />
              <button type="button" className="btn-secondary" onClick={this.props.onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function InspectModal({ record, onClose }) {
  if (!record) return null

  const relDetails = safeParseJson(record.relevance_details)
  const accDetails = safeParseJson(record.accuracy_details)
  const halDetails = safeParseJson(record.hallucination_details)
  const compDetails = safeParseJson(record.completeness_details)

  const relAlignPoints = safeList(relDetails.key_alignment_points)
  const relMissedPoints = safeList(relDetails.missed_aspects)
  const accVerifiedClaims = safeList(accDetails.verified_claims)
  const accCitations = safeList(accDetails.evidence_citations)
  const halFlaggedClaims = safeList(halDetails.flagged_claims)
  const compAddressed = safeList(compDetails.addressed_aspects)
  const compMissing = safeList(compDetails.missing_aspects)

  const finalVerdict = record.final_verdict || 'Unverified'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex-between">
          <div>
            <span className="modal-tag">Record #{record.row_index || record.id} Details</span>
            <h3 className="modal-title">Multi-Agent Evaluation Breakdown</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          <div className="modal-section-card">
            <div className="qa-pair-box">
              <div className="qa-row">
                <span className="qa-label">Question:</span>
                <p className="qa-content">{record.question || '—'}</p>
              </div>
              <div className="qa-row">
                <span className="qa-label">AI Response:</span>
                <p className="qa-content">{record.ai_response || '—'}</p>
              </div>
              {record.reference_answer && (
                <div className="qa-row">
                  <span className="qa-label">Reference Ground Truth:</span>
                  <p className="qa-content text-accent">{record.reference_answer}</p>
                </div>
              )}
            </div>
          </div>

          {(() => {
            const vLow = finalVerdict.toLowerCase()
            const isPass = vLow.includes('pass') && !vLow.includes('needs') && !vLow.includes('fail')
            const isConflict = vLow.includes('conflict')
            const isInsufficient = vLow.includes('insufficient') || vLow.includes('unverified') || vLow.includes('more info')
            const isNeeds = vLow.includes('needs') || vLow.includes('moderate')

            const bannerClass = isPass
              ? 'verdict-banner-pass'
              : isConflict
              ? 'verdict-banner-conflict'
              : isInsufficient
              ? 'verdict-banner-insufficient'
              : isNeeds
              ? 'verdict-banner-moderate'
              : 'verdict-banner-fail'

            return (
              <div className={`verdict-banner ${bannerClass}`}>
                <div className="verdict-banner-left">
                  <div className="verdict-icon-wrapper">
                    {isPass ? (
                      <CheckCircle2 size={24} />
                    ) : isConflict ? (
                      <GitCompare size={24} />
                    ) : isInsufficient ? (
                      <HelpCircle size={24} />
                    ) : isNeeds ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <XCircle size={24} />
                    )}
                  </div>
                  <div>
                    <div className="verdict-label-row">
                      <span className="verdict-status-title">FINAL VERDICT: {finalVerdict}</span>
                      {record.verdict_tag && record.verdict_tag !== finalVerdict && (
                        <span className="verdict-tag-pill">{record.verdict_tag}</span>
                      )}
                      {record.source_conflict_detected && (
                        <span className="conflict-tag-pill">Conflict in Ground Truth</span>
                      )}
                    </div>
                    <p className="verdict-summary-text">{record.verdict_summary || 'Evaluation completed across all 4 dimensions.'}</p>
                  </div>
                </div>

                <div className="verdict-banner-score">
                  <span className="composite-label">Weighted Score</span>
                  <span className="composite-number">{safeScore(record.composite_score, 2)}</span>
                  <span className="composite-max">/ 5.00</span>
                </div>
              </div>
            )
          })()}

          <div className="agent-grid-2col modal-grid">
            <div className={`agent-card ${getScoreColorClass(record.relevance_score)}`}>
              <div className="agent-card-header">
                <div className="agent-header-top">
                  <div className="agent-name-group">
                    <FileCheck size={16} />
                    <h4>Relevance Judge</h4>
                  </div>
                  <span className="agent-score-pill">{safeScore(record.relevance_score, 1)} / 5.0</span>
                </div>
                {relDetails.relevance_category && (
                  <span className="agent-sub-pill">{relDetails.relevance_category}</span>
                )}
              </div>
              <p className="agent-reasoning">{record.relevance_reasoning || relDetails.reasoning || 'No specific reasoning provided.'}</p>

              {relAlignPoints.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Key Alignment Points:</span>
                  <ul className="agent-sub-list">
                    {relAlignPoints.map((pt, i) => (
                      <li key={i} className="agent-sub-item item-align">
                        <span className="sub-bullet">✓</span>
                        <span>{formatAspectText(pt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relMissedPoints.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Missed / Ignored Aspects:</span>
                  <ul className="agent-sub-list">
                    {relMissedPoints.map((pt, i) => (
                      <li key={i} className="agent-sub-item item-missed">
                        <span className="sub-bullet">⚠</span>
                        <span>{formatAspectText(pt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className={`agent-card ${getScoreColorClass(record.accuracy_score)}`}>
              <div className="agent-card-header">
                <div className="agent-header-top">
                  <div className="agent-name-group">
                    <ShieldCheck size={16} />
                    <h4>Accuracy Judge</h4>
                  </div>
                  <span className="agent-score-pill">{safeScore(record.accuracy_score, 1)} / 5.0</span>
                </div>
                {accDetails.accuracy_category && (
                  <span className="agent-sub-pill">{accDetails.accuracy_category}</span>
                )}
              </div>
              <p className="agent-reasoning">{record.accuracy_reasoning || accDetails.reasoning || 'No specific reasoning provided.'}</p>

              {accVerifiedClaims.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Verified Claims ({accVerifiedClaims.length}):</span>
                  <div className="modal-claims-list">
                    {accVerifiedClaims.map((claim, i) => {
                      if (typeof claim === 'string') {
                        return (
                          <div key={i} className="modal-claim-card">
                            <div className="modal-claim-header">
                              <span className="claim-badge badge-supported">Verified</span>
                            </div>
                            <p className="claim-text">"{claim}"</p>
                          </div>
                        )
                      }
                      const verdict = claim.verdict || (claim.is_verified ? 'Verified' : 'Supported')
                      const badgeClass = (verdict || 'supported').toLowerCase().replace(/\s+/g, '-')
                      const claimText = claim.claim || claim.statement || claim.claim_text || 'Factual assertion'
                      const source = claim.evidence_source || claim.source || claim.evidence_ref
                      return (
                        <div key={i} className="modal-claim-card">
                          <div className="modal-claim-header">
                            <span className={`claim-badge badge-${badgeClass}`}>{verdict}</span>
                            {source && source !== 'None' && (
                              <span className="claim-src" title={source}>Source: {source}</span>
                            )}
                          </div>
                          <p className="claim-text">"{claimText}"</p>
                          {claim.explanation && (
                            <p className="claim-expl">{claim.explanation}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {accCitations.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Evidence Citations:</span>
                  <div className="modal-citations-list">
                    {accCitations.map((cite, i) => (
                      <div key={i} className="modal-citation-badge">
                        <span>🔗</span>
                        <span>{formatAspectText(cite)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`agent-card ${getScoreColorClass(record.hallucination_score)}`}>
              <div className="agent-card-header">
                <div className="agent-header-top">
                  <div className="agent-name-group">
                    <ShieldAlert size={16} />
                    <h4>Hallucination Agent</h4>
                  </div>
                  <span className="agent-score-pill">{safeScore(record.hallucination_score, 1)} / 5.0</span>
                </div>
                {halDetails.hallucination_level && (
                  <span className="agent-sub-pill">{halDetails.hallucination_level}</span>
                )}
              </div>
              <p className="agent-reasoning">{record.hallucination_reasoning || halDetails.reasoning || 'No specific reasoning provided.'}</p>

              {halFlaggedClaims.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Statement-by-Statement Audit ({halFlaggedClaims.length}):</span>
                  <div className="modal-claims-list">
                    {halFlaggedClaims.map((claim, i) => {
                      if (typeof claim === 'string') {
                        return (
                          <div key={i} className="modal-claim-card claim-flagged">
                            <div className="modal-claim-header">
                              <span className="claim-badge badge-fabricated">Flagged</span>
                            </div>
                            <p className="claim-text">"{claim}"</p>
                          </div>
                        )
                      }
                      const status = claim.classification || claim.grounding_status || (claim.is_flagged ? 'Flagged' : 'Supported')
                      const isFlagged = claim.is_flagged || ['unsupported', 'fabricated', 'contradictory', 'ungrounded', 'flagged'].includes(status.toLowerCase())
                      const badgeClass = status.toLowerCase().replace(/\s+/g, '-')
                      const claimText = claim.statement || claim.claim_text || claim.claim || 'Audit statement'
                      const source = claim.evidence_ref || claim.evidence_source
                      return (
                        <div key={i} className={`modal-claim-card ${isFlagged ? 'claim-flagged' : ''}`}>
                          <div className="modal-claim-header">
                            <span className={`claim-badge badge-${badgeClass}`}>{status}</span>
                            {source && source !== 'None' ? (
                              <span className="claim-src" title={source}>Ref: {source}</span>
                            ) : (
                              <span className="claim-src text-muted">No Evidence</span>
                            )}
                          </div>
                          <p className="claim-text">"{claimText}"</p>
                          {claim.explanation && (
                            <p className="claim-expl"><strong>Reason:</strong> {claim.explanation}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`agent-card ${getScoreColorClass(record.completeness_score)}`}>
              <div className="agent-card-header">
                <div className="agent-header-top">
                  <div className="agent-name-group">
                    <Scale size={16} />
                    <h4>Completeness Judge</h4>
                  </div>
                  <span className="agent-score-pill">{safeScore(record.completeness_score, 1)} / 5.0</span>
                </div>
                {compDetails.completeness_category && (
                  <span className="agent-sub-pill">{compDetails.completeness_category}</span>
                )}
              </div>
              <p className="agent-reasoning">{record.completeness_reasoning || compDetails.reasoning || 'No specific reasoning provided.'}</p>

              {compAddressed.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Addressed Aspects:</span>
                  <ul className="agent-sub-list">
                    {compAddressed.map((pt, i) => (
                      <li key={i} className="agent-sub-item item-align">
                        <span className="sub-bullet">✓</span>
                        <span>{formatAspectText(pt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {compMissing.length > 0 && (
                <div className="agent-sub-section">
                  <span className="agent-sub-title">Missing / Omitted Aspects:</span>
                  <ul className="agent-sub-list">
                    {compMissing.map((pt, i) => (
                      <li key={i} className="agent-sub-item item-missed">
                        <span className="sub-bullet">⚠</span>
                        <span>{formatAspectText(pt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer flex-between">
          <span className="modal-footer-note">Detailed multi-agent evaluation output</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            <X size={14} />
            <span>Close Inspection</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BatchEvaluationModule() {
  const [csvFile, setCsvFile] = useState(null)
  const [parsedPreview, setParsedPreview] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [batchId, setBatchId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchData, setBatchData] = useState(null)
  const [error, setError] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [filterVerdict, setFilterVerdict] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [aiEngine, setAiEngine] = useState('openai')

  const fileInputRef = useRef(null)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file.')
      return
    }
    setError('')
    setCsvFile(file)
    setBatchId(null)
    setBatchData(null)
    setCurrentPage(1)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result
        if (!text) return
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim())
        if (lines.length <= 1) {
          setError('CSV file contains no data rows.')
          return
        }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
        const preview = []
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          const cols = lines[i].split(',')
          const rowObj = {}
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] ? cols[idx].trim().replace(/^["']|["']$/g, '') : ''
          })
          preview.push(rowObj)
        }
        setParsedPreview(preview)
        setTotalRows(lines.length - 1)
      } catch (err) {
        setError('Failed to parse CSV preview: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  async function handleStartBatch() {
    if (!csvFile) {
      setError('Please select a CSV file first.')
      return
    }

    setError('')
    setIsProcessing(true)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('ai_engine', aiEngine)

      const res = await fetch('http://127.0.0.1:8000/api/evaluate/batch', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Batch initialization failed.')
      }

      const data = await res.json()
      const newBatchId = data.batch_id
      setBatchId(newBatchId)

      pollBatchStatus(newBatchId)
    } catch (err) {
      setError(err.message || 'Error uploading batch CSV.')
      setIsProcessing(false)
    }
  }

  function pollBatchStatus(id) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/evaluate/batch/${id}/status`)
        if (!res.ok) return
        const data = await res.json()
        setBatchData(data)

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 1200)
  }

  function handleReset() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    setCsvFile(null)
    setParsedPreview([])
    setTotalRows(0)
    setBatchId(null)
    setBatchData(null)
    setIsProcessing(false)
    setError('')
    setSelectedRecord(null)
    setCurrentPage(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDownloadSample() {
    window.location.href = 'http://127.0.0.1:8000/api/sample-csv'
  }

  function exportResultsCsv() {
    if (!batchData || !batchData.records || batchData.records.length === 0) return

    const headers = [
      'Row',
      'Question',
      'AI Response',
      'Reference Answer',
      'Relevance Score',
      'Accuracy Score',
      'Hallucination Score',
      'Completeness Score',
      'Overall Score',
      'Final Verdict',
      'Hallucination Detected',
      'Source Conflict Detected',
      'Verdict Summary',
    ]

    const rows = batchData.records.map((r) => [
      r.row_index || r.id,
      `"${(r.question || '').replace(/"/g, '""')}"`,
      `"${(r.ai_response || '').replace(/"/g, '""')}"`,
      `"${(r.reference_answer || '').replace(/"/g, '""')}"`,
      r.relevance_score,
      r.accuracy_score,
      r.hallucination_score,
      r.completeness_score,
      r.composite_score,
      `"${r.final_verdict}"`,
      r.hallucination_detected ? 'Yes' : 'No',
      r.source_conflict_detected ? 'Yes' : 'No',
      `"${(r.verdict_summary || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `batch_results_${batchData.batch_id || 'export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleDownloadBatchPdf() {
    const id = batchData?.batch_id || batchId
    if (!id) return
    try {
      setDownloadingPdf(true)
      const res = await fetch(`http://127.0.0.1:8000/api/history/batch/${id}/export-pdf`)
      if (!res.ok) {
        throw new Error('Failed to generate batch PDF report.')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Batch_Evaluation_Report_${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert(err.message || 'Error downloading batch PDF report')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const records = batchData?.records || []
  const stats = batchData?.statistics || {}

  const filteredRecords = records.filter((rec) => {
    if (filterVerdict !== 'ALL') {
      const v = (rec.final_verdict || '').toLowerCase()
      if (filterVerdict === 'PASS' && !v.includes('pass')) return false
      if (filterVerdict === 'NEEDS' && !v.includes('needs')) return false
      if (filterVerdict === 'FAIL' && (!v.includes('fail') || v.includes('pass') || v.includes('needs'))) return false
      if (filterVerdict === 'UNVERIFIED' && !v.includes('unverified')) return false
      if (filterVerdict === 'CONFLICT' && !rec.source_conflict_detected) return false
      if (filterVerdict === 'HALLUCINATED' && !rec.hallucination_detected) return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchQ = (rec.question || '').toLowerCase().includes(q)
      const matchA = (rec.ai_response || '').toLowerCase().includes(q)
      return matchQ || matchA
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const processedCount = batchData?.processed_count || 0
  const progressPercent = totalRows > 0 ? Math.min(100, Math.round((processedCount / totalRows) * 100)) : 0

  return (
    <div className="batch-module-container">
      <div className="batch-header-box">
        <div className="batch-header-left">
          <div className="batch-icon-badge">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="batch-title">Batch Evaluation Module</h2>
            <p className="batch-subtitle">
              Upload CSV containing multiple question-answer pairs to evaluate relevance, accuracy, hallucination, completeness, and final verdicts automatically.
            </p>
          </div>
        </div>
        <div className="batch-header-actions">
          <button
            type="button"
            className="btn-download-sample"
            onClick={handleDownloadSample}
            title="Download formatted benchmark CSV sample"
          >
            <Download size={14} />
            <span>Download Sample CSV</span>
          </button>
        </div>
      </div>

      <div className="engine-toggle-card batch-engine-card">
        <div className="engine-toggle-header">
          <span className="engine-toggle-label">Batch AI Evaluation Engine:</span>
          <span className="engine-active-indicator">
            {aiEngine === 'openai' ? '⚡ Tier-1 Primary Engine (Active)' : '✨ Multimodal Engine (Active)'}
          </span>
        </div>
        <div className="engine-toggle-group">
          <button
            type="button"
            className={`btn-engine-toggle ${aiEngine === 'openai' ? 'active' : ''}`}
            onClick={() => setAiEngine('openai')}
            disabled={isProcessing}
            title="OpenAI GPT-4o-mini: High Throughput, Zero Quota Freezing"
          >
            <Zap size={15} className="engine-icon text-accent" />
            <div className="engine-btn-text">
              <span className="engine-name">OpenAI GPT-4o-mini</span>
              <span className="engine-tag">Primary • High Throughput</span>
            </div>
          </button>
          <button
            type="button"
            className={`btn-engine-toggle ${aiEngine === 'gemini' ? 'active' : ''}`}
            onClick={() => setAiEngine('gemini')}
            disabled={isProcessing}
            title="Google Gemini 1.5: Multimodal Engine"
          >
            <Sparkles size={15} className="engine-icon text-purple" />
            <div className="engine-btn-text">
              <span className="engine-name">Google Gemini 1.5</span>
              <span className="engine-tag">Multimodal Engine</span>
            </div>
          </button>
        </div>
      </div>

      {!csvFile && (
        <div
          className="csv-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) {
              const syntheticEvent = { target: { files: [file] } }
              handleFileSelect(syntheticEvent)
            }
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <div className="dropzone-inner">
            <div className="dropzone-icon-circle">
              <UploadCloud size={32} />
            </div>
            <h3 className="dropzone-title">Upload Evaluation CSV Dataset</h3>
            <p className="dropzone-desc">
              Drag & drop your CSV file here or click to browse. Supports files with 1 to 100+ Q&A entries.
            </p>
            <div className="csv-format-hints">
              <span className="hint-pill">Required: <code>question</code></span>
              <span className="hint-pill">Required: <code>ai_response</code></span>
              <span className="hint-pill optional">Optional: <code>reference_answer</code></span>
              <span className="hint-pill optional">Optional: <code>source_information</code></span>
            </div>
          </div>
        </div>
      )}

      {csvFile && !batchData && (
        <div className="batch-preview-card">
          <div className="card-header flex-between">
            <div className="file-info-header">
              <FileSpreadsheet size={18} className="text-accent" />
              <div>
                <h4 className="file-name-title">{csvFile.name}</h4>
                <p className="file-meta-text">
                  {(csvFile.size / 1024).toFixed(1)} KB • {totalRows} records detected
                </p>
              </div>
            </div>
            <div className="flex-gap">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                disabled={isProcessing}
              >
                <RotateCcw size={14} />
                <span>Change File</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartBatch}
                disabled={isProcessing}
              >
                <Play size={14} />
                <span>Start Batch Evaluation ({totalRows} Rows)</span>
              </button>
            </div>
          </div>

          <div className="preview-table-wrapper">
            <span className="preview-label">Dataset Preview (First {parsedPreview.length} entries):</span>
            <table className="batch-preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>AI Response</th>
                  <th>Reference Answer</th>
                </tr>
              </thead>
              <tbody>
                {parsedPreview.map((row, idx) => (
                  <tr key={idx}>
                    <td className="col-idx">{idx + 1}</td>
                    <td className="col-q">{row.question || row.query || '—'}</td>
                    <td className="col-ans">{row.ai_response || row.response || '—'}</td>
                    <td className="col-ref">{row.reference_answer || row.ground_truth || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* While processing and NO records yet: show dedicated evaluating hero */}
      {isProcessing && records.length === 0 && (
        <div className="batch-evaluating-hero">
          <div className="evaluating-hero-graphic">
            <div className="hero-spinner-ring" />
            <Scale size={26} className="hero-eval-icon" />
          </div>
          <h3 className="evaluating-hero-title">Multi-Agent Evaluation in Progress...</h3>
          <p className="evaluating-hero-subtitle">
            Evaluating dataset through 5 specialized LLM judges (Relevance, Fact Verification, Hallucination, Completeness & Verdict).
          </p>
          <div className="evaluating-hero-engine-badge">
            <Zap size={13} className="text-accent" />
            <span>High-Throughput Engine: OpenAI GPT-4o-mini (Zero Quota Freezes)</span>
          </div>
          <div className="evaluating-hero-status">
            <div className="hero-status-pill">
              <div className="pulsing-dot" />
              <span>
                {batchData?.current_question
                  ? `Row 1 of ${totalRows}: "${batchData.current_question}..."`
                  : `Initializing multi-agent pipeline for ${totalRows} entries...`}
              </span>
            </div>
          </div>
          <div className="hero-progress-track">
            <div className="hero-progress-bar-indeterminate" />
          </div>
        </div>
      )}

      {/* When processing and at least 1 record has arrived: show progress bar */}
      {isProcessing && records.length > 0 && (
        <div className="batch-progress-card">
          <div className="progress-header-row">
            <div className="flex-align-center">
              <div className="pulsing-dot" />
              <span className="progress-title">
                Evaluating Batch Dataset: {processedCount} of {totalRows} completed ({progressPercent}%)
              </span>
              <span className="batch-engine-tag-sm">
                <Zap size={12} className="text-accent" />
                <span>GPT-4o-mini Engine</span>
              </span>
            </div>
            <span className="progress-eta">
              {batchData?.current_question ? `Current: "${batchData.current_question}..."` : 'Processing agents in parallel...'}
            </span>
          </div>

          <div className="batch-progress-track">
            <div
              className="batch-progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="error-card">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {(records.length > 0 || (!isProcessing && batchData)) && (
        <div className="batch-results-view">
          <div className="batch-engine-active-bar flex-between">
            <div className="flex-align-center">
              <Zap size={14} className="text-accent" />
              <span className="batch-engine-active-text">
                Evaluated with <strong>OpenAI GPT-4o-mini</strong> • High-Throughput Parallel Engine
              </span>
            </div>
            <span className="batch-engine-status-pill">Tier-1 High RPM Pipeline</span>
          </div>
          {batchData.rate_limit_notice && (
            <div className="batch-rate-limit-banner">
              <AlertTriangle size={18} className="banner-icon-amber" />
              <div>
                <strong className="banner-title">Batch Finalized Early: API Quota / Rate Limit Reached</strong>
                <p className="banner-desc">{batchData.rate_limit_notice}</p>
              </div>
            </div>
          )}
          <div className="batch-stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Evaluated</span>
              <div className="stat-val-group">
                <span className="stat-number">{stats.processed || 0}</span>
                <span className="stat-sub">/ {totalRows} rows</span>
              </div>
            </div>

            <div className="stat-card stat-pass">
              <span className="stat-label">Pass Rate</span>
              <div className="stat-val-group">
                <span className="stat-number text-pass">
                  {stats.processed > 0 ? Math.round(((stats.passed || 0) / stats.processed) * 100) : 0}%
                </span>
                <span className="stat-sub">{stats.passed || 0} Passed</span>
              </div>
            </div>

            <div className="stat-card stat-needs">
              <span className="stat-label">Needs Improvement</span>
              <div className="stat-val-group">
                <span className="stat-number text-needs">
                  {stats.processed > 0 ? Math.round(((stats.needs_improvement || 0) / stats.processed) * 100) : 0}%
                </span>
                <span className="stat-sub">{stats.needs_improvement || 0} Flagged</span>
              </div>
            </div>

            <div className="stat-card stat-fail">
              <span className="stat-label">Fail Rate</span>
              <div className="stat-val-group">
                <span className="stat-number text-fail">
                  {stats.processed > 0 ? Math.round(((stats.failed || 0) / stats.processed) * 100) : 0}%
                </span>
                <span className="stat-sub">{stats.failed || 0} Failed</span>
              </div>
            </div>

            <div className="stat-card stat-hallucination">
              <span className="stat-label">Hallucination Frequency</span>
              <div className="stat-val-group">
                <span className="stat-number text-purple">{stats.hallucination_rate || 0}%</span>
                <span className="stat-sub">{stats.hallucinations_detected || 0} with Ungrounded Claims</span>
              </div>
            </div>

            <div className="stat-card stat-conflicts">
              <span className="stat-label">Ground Truth Conflicts</span>
              <div className="stat-val-group">
                <span className="stat-number text-orange">{stats.source_conflicts || 0}</span>
                <span className="stat-sub">Ref vs RAG Discrepancies</span>
              </div>
            </div>
          </div>

          <div className="batch-averages-bar">
            <div className="average-metric">
              <span className="avg-label">Average Overall</span>
              <span className="avg-score">{stats.avg_overall?.toFixed(2) || '0.00'} / 5.00</span>
            </div>
            <div className="avg-divider" />
            <div className="average-metric">
              <span className="avg-label">Relevance Avg</span>
              <span className="avg-dim-score">{stats.avg_relevance?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="average-metric">
              <span className="avg-label">Accuracy Avg</span>
              <span className="avg-dim-score">{stats.avg_accuracy?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="average-metric">
              <span className="avg-label">Hallucination Avg</span>
              <span className="avg-dim-score">{stats.avg_hallucination?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="average-metric">
              <span className="avg-label">Completeness Avg</span>
              <span className="avg-dim-score">{stats.avg_completeness?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <div className="batch-table-container">
            <div className="batch-table-toolbar">
              <div className="table-filters-row">
                <span className="filter-label">Filter Verdict:</span>
                <button
                  type="button"
                  className={`btn-filter ${filterVerdict === 'ALL' ? 'active' : ''}`}
                  onClick={() => { setFilterVerdict('ALL'); setCurrentPage(1) }}
                >
                  All ({records.length})
                </button>
                <button
                  type="button"
                  className={`btn-filter ${filterVerdict === 'PASS' ? 'active' : ''}`}
                  onClick={() => { setFilterVerdict('PASS'); setCurrentPage(1) }}
                >
                  Pass ({stats.passed || 0})
                </button>
                <button
                  type="button"
                  className={`btn-filter ${filterVerdict === 'NEEDS' ? 'active' : ''}`}
                  onClick={() => { setFilterVerdict('NEEDS'); setCurrentPage(1) }}
                >
                  Needs Improvement ({stats.needs_improvement || 0})
                </button>
                <button
                  type="button"
                  className={`btn-filter ${filterVerdict === 'FAIL' ? 'active' : ''}`}
                  onClick={() => { setFilterVerdict('FAIL'); setCurrentPage(1) }}
                >
                  Fail ({stats.failed || 0})
                </button>
                <button
                  type="button"
                  className={`btn-filter ${filterVerdict === 'CONFLICT' ? 'active' : ''}`}
                  onClick={() => { setFilterVerdict('CONFLICT'); setCurrentPage(1) }}
                >
                  Conflicts ({stats.source_conflicts || 0})
                </button>
              </div>

              <div className="table-search-actions">
                <div className="search-input-wrapper">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search queries in batch..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="batch-search-input"
                  />
                </div>
                <button
                  type="button"
                  className="btn-export-csv"
                  onClick={exportResultsCsv}
                  title="Export results table to CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  className="btn-export-pdf"
                  onClick={handleDownloadBatchPdf}
                  disabled={downloadingPdf || records.length === 0}
                  title="Export entire batch audit report as a consolidated PDF"
                >
                  <FileDown size={14} />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Export Batch PDF'}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  <span>New Batch</span>
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="batch-results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>AI Response</th>
                    <th>Relevance</th>
                    <th>Accuracy</th>
                    <th>Hallucination</th>
                    <th>Completeness</th>
                    <th>Overall</th>
                    <th>Verdict</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((rec) => (
                      <tr key={rec.id || rec.row_index} className="batch-row">
                        <td className="col-idx">{rec.row_index || rec.id}</td>
                        <td className="col-q-text" title={rec.question}>
                          <span className="cell-truncate">{rec.question}</span>
                        </td>
                        <td className="col-ans-text" title={rec.ai_response}>
                          <span className="cell-truncate">{rec.ai_response}</span>
                        </td>
                        <td>
                          <span className={`score-badge ${getScorePillClass(rec.relevance_score)}`}>
                            {safeScore(rec.relevance_score, 1)}
                          </span>
                        </td>
                        <td>
                          <span className={`score-badge ${getScorePillClass(rec.accuracy_score)}`}>
                            {safeScore(rec.accuracy_score, 1)}
                          </span>
                        </td>
                        <td>
                          <span className={`score-badge ${getScorePillClass(rec.hallucination_score)}`}>
                            {safeScore(rec.hallucination_score, 1)}
                          </span>
                        </td>
                        <td>
                          <span className={`score-badge ${getScorePillClass(rec.completeness_score)}`}>
                            {safeScore(rec.completeness_score, 1)}
                          </span>
                        </td>
                        <td>
                          <strong className="overall-score-txt">{safeScore(rec.composite_score, 2)}</strong>
                        </td>
                        <td>
                          <div className="verdict-col-group">
                            <span className={`batch-verdict-badge ${getVerdictBadgeClass(rec.final_verdict)}`}>
                              {rec.final_verdict}
                            </span>
                            {rec.source_conflict_detected && (
                              <span className="conflict-tag-pill" title="Discrepancy detected between Reference Answer and RAG chunks">
                                Conflict
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-inspect-row"
                            onClick={() => setSelectedRecord(rec)}
                            title="Inspect detailed 4-agent evaluation breakdown"
                          >
                            <Eye size={14} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="empty-table-cell">
                        No records match the active filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-bar flex-between">
                <span className="page-indicator">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
                </span>
                <div className="pagination-btns">
                  <button
                    type="button"
                    className="btn-page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="page-curr">{currentPage} / {totalPages}</span>
                  <button
                    type="button"
                    className="btn-page"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRecord && (
        <InspectErrorBoundary onClose={() => setSelectedRecord(null)}>
          <InspectModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        </InspectErrorBoundary>
      )}
    </div>
  )
}
