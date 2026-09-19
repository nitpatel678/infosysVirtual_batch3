import React, { useState, useEffect } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Eye,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Loader2,
  Layers,
  Sparkles,
  HelpCircle,
  Download,
  FileDown,
} from 'lucide-react'

function safeParse(val, fallback = {}) {
  if (!val) return fallback
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return fallback
  }
}

function getScoreColorClass(score) {
  if (score >= 4.0) return 'score-card-pass'
  if (score >= 3.0) return 'score-card-warn'
  return 'score-card-fail'
}

function getAccCategory(score, category, contradiction) {
  if (contradiction) return 'Contradictory'
  if (score <= 2.0) return 'Incorrect'
  if (category === 'Correct' && score < 3.5) return 'Partially Correct'
  return category || (score >= 4.0 ? 'Correct' : score >= 2.5 ? 'Partially Correct' : 'Incorrect')
}

function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('correct') && !cat.includes('in') && !cat.includes('partially')) return 'badge-cat-pass'
  if (cat.includes('partially') || cat.includes('mostly')) return 'badge-cat-warn'
  if (cat.includes('incorrect') || cat.includes('contradict') || cat.includes('severely') || cat.includes('substantially')) return 'badge-cat-fail'
  return 'badge-cat-neutral'
}

export default function HistoryDashboard({ onSelectEvaluation, onBackToForm }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecordId, setSelectedRecordId] = useState(null)
  const [recordDetail, setRecordDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [activeAgentTab, setActiveAgentTab] = useState('relevance')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  async function handleDownloadPdf(evalId) {
    if (!evalId) return
    try {
      setDownloadingPdf(true)
      const res = await fetch(`http://127.0.0.1:8000/api/history/${evalId}/export-pdf`)
      if (!res.ok) {
        throw new Error('Failed to generate PDF audit report.')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `AI_Evaluation_Report_${evalId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert(err.message || 'Error downloading PDF report')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function fetchHistory() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/history?limit=50')
      if (!res.ok) {
        throw new Error('Failed to fetch evaluation records from database')
      }
      const data = await res.json()
      setRecords(data.records || [])
    } catch (err) {
      setError(err.message || 'Could not connect to database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  async function handleViewRecord(id) {
    setSelectedRecordId(id)
    setDetailLoading(true)
    setDetailError('')
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/history/${id}`)
      if (!res.ok) {
        throw new Error('Failed to load evaluation record details')
      }
      const data = await res.json()
      setRecordDetail(data.record)
    } catch (err) {
      setDetailError(err.message || 'Error loading evaluation record')
    } finally {
      setDetailLoading(false)
    }
  }

  function handleBackToRecords() {
    setSelectedRecordId(null)
    setRecordDetail(null)
    setDetailError('')
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A'
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return isoStr
    }
  }

  if (selectedRecordId !== null) {
    const relDetails = safeParse(recordDetail?.relevance_details)
    const accDetails = safeParse(recordDetail?.accuracy_details)
    const halDetails = safeParse(recordDetail?.hallucination_details)
    const compDetails = safeParse(recordDetail?.completeness_details)
    const verdDetails = safeParse(recordDetail?.verdict_details)
    const evidenceList = safeParse(recordDetail?.retrieved_evidence, [])

    const accScore = recordDetail?.accuracy_score || 0.0
    const accContradiction = accDetails.contradiction_detected || false
    const calibratedAccCategory = getAccCategory(accScore, accDetails.accuracy_category, accContradiction)

    const verdictStatus = recordDetail?.final_verdict || verdDetails.status || 'EVALUATED'
    const isPass = verdictStatus.toLowerCase().includes('pass')
    const isNeeds = verdictStatus.toLowerCase().includes('needs') || verdictStatus.toLowerCase().includes('moderate')
    const isUnverified = verdictStatus.toLowerCase().includes('unverified')
    const hasConflict = verdDetails.source_conflict_detected || compDetails.source_conflict_detected || accContradiction

    return (
      <div className="history-container">
        <div className="report-nav-bar">
          <button type="button" onClick={handleBackToRecords} className="history-back-btn">
            <ArrowLeft size={15} />
            <span>Back to Records List</span>
          </button>
          <div className="report-nav-actions">
            <button
              type="button"
              onClick={() => handleDownloadPdf(selectedRecordId)}
              className="btn-download-pdf"
              disabled={downloadingPdf}
              title="Download Formal PDF Evaluation Report"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 size={14} className="spin-icon" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download PDF Report</span>
                </>
              )}
            </button>
            <button type="button" onClick={onBackToForm} className="nav-history-btn nav-new-btn">
              <RotateCcw size={14} />
              <span>Back to Evaluator</span>
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="history-loading">
            <Loader2 size={24} className="spin-icon" />
            <p>Loading evaluation report #{selectedRecordId}...</p>
          </div>
        ) : detailError ? (
          <div className="error-card">
            <AlertCircle size={15} />
            <span>{detailError}</span>
          </div>
        ) : recordDetail ? (
          <div className="results-container record-dashboard-view">
            {/* Top Response Context Card */}
            <div className="top-response-card">
              <div className="top-response-header">
                <div className="top-response-meta">
                  <span className="section-badge">Evaluation Record</span>
                  <span className="db-record-tag">Record #{recordDetail.id}</span>
                  <span className="text-muted-tag">{formatDate(recordDetail.created_at)}</span>
                </div>

                <div className="top-score-box">
                  <div className="top-score-details">
                    <span className="top-score-title">Composite Score</span>
                    <div className="top-score-val-row">
                      <span className="top-score-number">{recordDetail.composite_score?.toFixed(2)}</span>
                      <span className="top-score-scale">/ 5.00</span>
                    </div>
                  </div>
                  <div className={`verdict-mini-badge ${isPass ? 'verdict-mini-pass' : isNeeds ? 'verdict-mini-warn' : isUnverified ? 'verdict-mini-unverified' : 'verdict-mini-fail'}`}>
                    {isPass ? <CheckCircle2 size={14} /> : isNeeds ? <AlertTriangle size={14} /> : isUnverified ? <HelpCircle size={14} /> : <XCircle size={14} />}
                    <span>{verdictStatus}</span>
                  </div>
                </div>
              </div>

              <div className="ai-response-content">
                <span className="context-label" style={{ marginBottom: 6, display: 'block' }}>Evaluated AI Response:</span>
                {recordDetail.ai_response?.split('\n').map((line, idx) => (
                  <p key={idx} className="ai-response-paragraph">{line}</p>
                ))}
              </div>

              <div className="context-subgrid">
                <div className="context-item">
                  <span className="context-label">User Query:</span>
                  <p className="context-value">{recordDetail.question}</p>
                </div>

                {recordDetail.reference_answer && (
                  <div className="context-item">
                    <span className="context-label">Reference Ground Truth:</span>
                    <p className="context-value">{recordDetail.reference_answer}</p>
                  </div>
                )}

                {recordDetail.source_document_name && (
                  <div className="context-item">
                    <span className="context-label">Source Document:</span>
                    <p className="context-value">{recordDetail.source_document_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comprehensive Verdict Banner with Strengths & Issues */}
            <div className={`verdict-banner ${
              isPass
                ? 'verdict-banner-pass'
                : isNeeds
                ? 'verdict-banner-moderate'
                : isUnverified
                ? 'verdict-banner-unverified'
                : 'verdict-banner-fail'
            }`}>
              <div className="verdict-banner-left">
                <div className="verdict-icon-wrapper">
                  {isPass ? (
                    <CheckCircle2 size={26} />
                  ) : isNeeds ? (
                    <AlertTriangle size={26} />
                  ) : isUnverified ? (
                    <AlertCircle size={26} />
                  ) : (
                    <XCircle size={26} />
                  )}
                </div>
                <div>
                  <div className="verdict-label-row">
                    <span className="verdict-status-title">
                      FINAL VERDICT: {verdictStatus}
                    </span>
                    {hasConflict && (
                      <span className="conflict-tag-pill" title="Discrepancy detected between Reference Ground Truth and Benchmark Knowledge Base">
                        Conflict in Ground Truth
                      </span>
                    )}
                    <span className="formula-tag-pill">
                      Weights: 25% Rel • 35% Acc • 25% Hal • 15% Comp
                    </span>
                  </div>
                  <p className="verdict-summary-text">{recordDetail.verdict_summary || verdDetails.summary}</p>

                  {verdDetails.major_issues && verdDetails.major_issues.length > 0 && (
                    <div className="verdict-issues-row">
                      <span className="issues-label">Key Issues:</span>
                      {verdDetails.major_issues.map((iss, i) => (
                        <span key={i} className="issue-pill">⚠ {iss}</span>
                      ))}
                    </div>
                  )}

                  {verdDetails.strengths && verdDetails.strengths.length > 0 && (
                    <div className="verdict-issues-row">
                      <span className="issues-label">Strengths:</span>
                      {verdDetails.strengths.map((str, i) => (
                        <span key={i} className="strength-pill">✓ {str}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="verdict-banner-score">
                <span className="composite-label">Weighted Overall</span>
                <span className="composite-number">{recordDetail.composite_score?.toFixed(2)}</span>
                <span className="composite-max">/ 5.00</span>
              </div>
            </div>

            {/* Agent Scores & Reasoning Section */}
            <div className="agent-scores-section">
              <div className="section-header-row">
                <h3 className="section-subtitle">Evaluation Agent Scores & Reasoning</h3>
                <span className="section-hint-badge">Click tabs to view full agent breakdown</span>
              </div>

              <div className="agent-tabs-nav">
                <button
                  type="button"
                  className={`agent-tab-btn ${activeAgentTab === 'relevance' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAgentTab('relevance')}
                >
                  <FileCheck size={14} />
                  <span>Relevance Judge</span>
                  <span className="tab-score-pill">{recordDetail.relevance_score?.toFixed(1)}</span>
                </button>
                <button
                  type="button"
                  className={`agent-tab-btn ${activeAgentTab === 'accuracy' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAgentTab('accuracy')}
                >
                  <ShieldCheck size={14} />
                  <span>Accuracy Judge</span>
                  <span className="tab-score-pill">{recordDetail.accuracy_score?.toFixed(1)}</span>
                </button>
                <button
                  type="button"
                  className={`agent-tab-btn ${activeAgentTab === 'hallucination' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAgentTab('hallucination')}
                >
                  <ShieldAlert size={14} />
                  <span>Hallucination Agent</span>
                  <span className="tab-score-pill">{recordDetail.hallucination_score?.toFixed(1)}</span>
                </button>
                <button
                  type="button"
                  className={`agent-tab-btn ${activeAgentTab === 'completeness' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAgentTab('completeness')}
                >
                  <Scale size={14} />
                  <span>Completeness Judge</span>
                  <span className="tab-score-pill">{recordDetail.completeness_score?.toFixed(1)}</span>
                </button>
                <button
                  type="button"
                  className={`agent-tab-btn tab-btn-overview ${activeAgentTab === 'all' ? 'tab-active' : ''}`}
                  onClick={() => setActiveAgentTab('all')}
                >
                  <Layers size={14} />
                  <span>All 4 Overview</span>
                </button>
              </div>

              {/* 1. Relevance Judge Tab */}
              {activeAgentTab === 'relevance' && (
                <div className={`agent-card agent-card-full ${getScoreColorClass(recordDetail.relevance_score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <FileCheck size={16} />
                        <h4>Relevance Judge</h4>
                      </div>
                      <span className="agent-score-pill">
                        {recordDetail.relevance_score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    {relDetails.relevance_category && (
                      <div className="agent-header-badges">
                        <span className={`agent-sub-pill ${getCategoryBadgeClass(relDetails.relevance_category)}`}>
                          {relDetails.relevance_category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(recordDetail.relevance_score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="agent-reasoning">{recordDetail.relevance_reasoning || relDetails.reasoning}</p>

                  {relDetails.key_alignment_points && relDetails.key_alignment_points.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Direct Question Alignments:</span>
                      <ul className="agent-sub-list">
                        {relDetails.key_alignment_points.map((pt, i) => (
                          <li key={i} className="agent-sub-item item-align">
                            <span className="sub-bullet">✓</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {relDetails.missed_aspects && relDetails.missed_aspects.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Missed Query Nuances:</span>
                      <ul className="agent-sub-list">
                        {relDetails.missed_aspects.map((pt, i) => (
                          <li key={i} className="agent-sub-item item-missed">
                            <span className="sub-bullet">⚠</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Accuracy Judge Tab */}
              {activeAgentTab === 'accuracy' && (
                <div className={`agent-card agent-card-full ${getScoreColorClass(recordDetail.accuracy_score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <ShieldCheck size={16} />
                        <h4>Accuracy Judge</h4>
                      </div>
                      <span className="agent-score-pill">
                        {recordDetail.accuracy_score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="agent-header-badges">
                      <span className={`agent-sub-pill ${getCategoryBadgeClass(calibratedAccCategory)}`}>
                        {calibratedAccCategory}
                      </span>
                      {accContradiction && (
                        <span className="conflict-tag-pill">Contradiction Detected</span>
                      )}
                    </div>
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(recordDetail.accuracy_score / 5) * 100}%` }}
                    />
                  </div>

                  {accContradiction && (
                    <div className="agent-notice-banner notice-contradiction">
                      <AlertTriangle size={14} />
                      <span><strong>Contradiction Warning:</strong> Reference ground truth directly conflicts with benchmark evidence.</span>
                    </div>
                  )}

                  {accDetails.is_insufficient_evidence && (
                    <div className="agent-notice-banner notice-insufficient">
                      <AlertCircle size={14} />
                      <span><strong>Closed-World Grounding Notice:</strong> No reference answer or matching knowledge base evidence was available. Score is marked Unverified.</span>
                    </div>
                  )}

                  <p className="agent-reasoning">{recordDetail.accuracy_reasoning || accDetails.reasoning}</p>

                  {accDetails.verified_claims && accDetails.verified_claims.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Fact-Checked Claims ({accDetails.verified_claims.length}):</span>
                      <div className="claims-list">
                        {accDetails.verified_claims.map((c, i) => (
                          <div key={i} className="claim-box">
                            <div className="claim-header">
                              <span className={`claim-badge badge-${(c.verdict || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                {c.verdict}
                              </span>
                              {c.evidence_source && c.evidence_source !== 'None' && (
                                <span className="claim-src" title={c.evidence_source}>
                                  Source: {c.evidence_source}
                                </span>
                              )}
                            </div>
                            <p className="claim-text">"{c.claim}"</p>
                            {c.explanation && <p className="claim-expl">{c.explanation}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {accDetails.evidence_citations && accDetails.evidence_citations.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Evidence Citations:</span>
                      <div className="citations-list">
                        {accDetails.evidence_citations.map((cit, i) => (
                          <span key={i} className="citation-pill">{cit}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Hallucination Agent Tab */}
              {activeAgentTab === 'hallucination' && (
                <div className={`agent-card agent-card-full ${getScoreColorClass(recordDetail.hallucination_score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <ShieldAlert size={16} />
                        <h4>Hallucination Detection Agent</h4>
                      </div>
                      <span className="agent-score-pill">
                        {recordDetail.hallucination_score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="agent-header-badges">
                      {halDetails.hallucination_level && (
                        <span className={`agent-sub-pill ${getCategoryBadgeClass(halDetails.hallucination_level)}`}>
                          {halDetails.hallucination_level}
                        </span>
                      )}
                      <span className={`hal-status-tag ${(!halDetails.hallucination_count || halDetails.hallucination_count === 0) ? 'hal-tag-clean' : 'hal-tag-warn'}`}>
                        {(!halDetails.hallucination_count || halDetails.hallucination_count === 0)
                          ? '0 Flagged Statements'
                          : `${halDetails.hallucination_count} Statement(s) Flagged`}
                      </span>
                    </div>
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(recordDetail.hallucination_score / 5) * 100}%` }}
                    />
                  </div>

                  {halDetails.is_insufficient_evidence && (
                    <div className="agent-notice-banner notice-insufficient">
                      <AlertCircle size={15} />
                      <span><strong>Closed-World Evaluation Notice:</strong> Grounding status cannot be established without reference context or benchmark chunks.</span>
                    </div>
                  )}

                  <p className="agent-reasoning">{recordDetail.hallucination_reasoning || halDetails.reasoning}</p>

                  {halDetails.flagged_claims && halDetails.flagged_claims.length > 0 && (
                    <div className="agent-sub-section">
                      <div className="flex-between">
                        <span className="agent-sub-title">Statement-by-Statement Hallucination Audit ({halDetails.flagged_claims.length} claims):</span>
                        <span className="section-hint-badge">Cross-referenced against RAG & Ground Truth</span>
                      </div>
                      <div className="claims-list">
                        {halDetails.flagged_claims.map((c, i) => {
                          const isFlagged = c.is_flagged || ['unsupported', 'fabricated', 'contradictory', 'ungrounded'].includes(c.classification?.toLowerCase() || c.grounding_status?.toLowerCase());
                          const badgeClass = (c.classification || c.grounding_status || '').toLowerCase().replace(/\s+/g, '-');
                          return (
                            <div key={i} className={`claim-box ${isFlagged ? 'claim-flagged' : ''}`}>
                              <div className="claim-header">
                                <span className={`claim-badge badge-${badgeClass}`}>
                                  {c.classification || c.grounding_status}
                                </span>
                                {c.evidence_ref && c.evidence_ref !== 'None' ? (
                                  <span className="claim-src" title={c.evidence_ref}>
                                    Source: {c.evidence_ref}
                                  </span>
                                ) : (
                                  <span className="claim-src">No Grounding Evidence</span>
                                )}
                              </div>
                              <p className="claim-text">"{c.statement || c.claim_text}"</p>
                              {c.explanation && (
                                <p className="claim-expl">
                                  <strong>Reason:</strong> {c.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Completeness Judge Tab */}
              {activeAgentTab === 'completeness' && (
                <div className={`agent-card agent-card-full ${getScoreColorClass(recordDetail.completeness_score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <Scale size={16} />
                        <h4>Completeness Judge</h4>
                      </div>
                      <span className="agent-score-pill">
                        {recordDetail.completeness_score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="agent-header-badges">
                      {compDetails.completeness_category && (
                        <span className={`agent-sub-pill ${getCategoryBadgeClass(compDetails.completeness_category)}`}>
                          {compDetails.completeness_category}
                        </span>
                      )}
                      {compDetails.source_conflict_detected && (
                        <span className="conflict-tag-pill" title="Discrepancy detected between Reference Ground Truth and Benchmark Knowledge Base">
                          Conflict in Ground Truth
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(recordDetail.completeness_score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="agent-reasoning">{recordDetail.completeness_reasoning || compDetails.reasoning}</p>

                  {compDetails.identified_requirements && compDetails.identified_requirements.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Identified Question Requirements:</span>
                      <ul className="agent-sub-list">
                        {compDetails.identified_requirements.map((req, i) => (
                          <li key={i} className="agent-sub-item item-req">
                            <span className="sub-bullet">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {compDetails.addressed_aspects && compDetails.addressed_aspects.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Addressed Aspects:</span>
                      <ul className="agent-sub-list">
                        {compDetails.addressed_aspects.map((pt, i) => (
                          <li key={i} className="agent-sub-item item-align">
                            <span className="sub-bullet">✓</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {compDetails.missing_aspects && compDetails.missing_aspects.length > 0 && (
                    <div className="agent-sub-section">
                      <span className="agent-sub-title">Missing / Omitted Aspects:</span>
                      <ul className="agent-sub-list">
                        {compDetails.missing_aspects.map((pt, i) => (
                          <li key={i} className="agent-sub-item item-missed">
                            <span className="sub-bullet">⚠</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 5. All 4 Overview Tab */}
              {activeAgentTab === 'all' && (
                <div className="agent-grid-2col">
                  {/* Relevance */}
                  <div className={`agent-card ${getScoreColorClass(recordDetail.relevance_score)}`}>
                    <div className="agent-card-header">
                      <div className="agent-header-top">
                        <div className="agent-name-group">
                          <FileCheck size={16} />
                          <h4>Relevance Judge</h4>
                        </div>
                        <span className="agent-score-pill">
                          {recordDetail.relevance_score?.toFixed(1)} / 5.0
                        </span>
                      </div>
                      {relDetails.relevance_category && (
                        <div className="agent-header-badges">
                          <span className={`agent-sub-pill ${getCategoryBadgeClass(relDetails.relevance_category)}`}>
                            {relDetails.relevance_category}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="score-bar-bg">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${(recordDetail.relevance_score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="agent-reasoning">{recordDetail.relevance_reasoning || relDetails.reasoning}</p>
                  </div>

                  {/* Hallucination */}
                  <div className={`agent-card ${getScoreColorClass(recordDetail.hallucination_score)}`}>
                    <div className="agent-card-header">
                      <div className="agent-header-top">
                        <div className="agent-name-group">
                          <ShieldAlert size={16} />
                          <h4>Hallucination Detection</h4>
                        </div>
                        <span className="agent-score-pill">
                          {recordDetail.hallucination_score?.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="agent-header-badges">
                        {halDetails.hallucination_level && (
                          <span className={`agent-sub-pill ${getCategoryBadgeClass(halDetails.hallucination_level)}`}>
                            {halDetails.hallucination_level}
                          </span>
                        )}
                        <span className={`hal-status-tag ${(!halDetails.hallucination_count || halDetails.hallucination_count === 0) ? 'hal-tag-clean' : 'hal-tag-warn'}`}>
                          {(!halDetails.hallucination_count || halDetails.hallucination_count === 0)
                            ? '0 Ungrounded'
                            : `${halDetails.hallucination_count} Flagged`}
                        </span>
                      </div>
                    </div>
                    <div className="score-bar-bg">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${(recordDetail.hallucination_score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="agent-reasoning">{recordDetail.hallucination_reasoning || halDetails.reasoning}</p>
                  </div>

                  {/* Accuracy */}
                  <div className={`agent-card ${getScoreColorClass(recordDetail.accuracy_score)}`}>
                    <div className="agent-card-header">
                      <div className="agent-header-top">
                        <div className="agent-name-group">
                          <ShieldCheck size={16} />
                          <h4>Accuracy Judge</h4>
                        </div>
                        <span className="agent-score-pill">
                          {recordDetail.accuracy_score?.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="agent-header-badges">
                        <span className={`agent-sub-pill ${getCategoryBadgeClass(calibratedAccCategory)}`}>
                          {calibratedAccCategory}
                        </span>
                      </div>
                    </div>
                    <div className="score-bar-bg">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${(recordDetail.accuracy_score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="agent-reasoning">{recordDetail.accuracy_reasoning || accDetails.reasoning}</p>
                  </div>

                  {/* Completeness */}
                  <div className={`agent-card ${getScoreColorClass(recordDetail.completeness_score)}`}>
                    <div className="agent-card-header">
                      <div className="agent-header-top">
                        <div className="agent-name-group">
                          <Scale size={16} />
                          <h4>Completeness Judge</h4>
                        </div>
                        <span className="agent-score-pill">
                          {recordDetail.completeness_score?.toFixed(1)} / 5.0
                        </span>
                      </div>
                      {compDetails.completeness_category && (
                        <div className="agent-header-badges">
                          <span className={`agent-sub-pill ${getCategoryBadgeClass(compDetails.completeness_category)}`}>
                            {compDetails.completeness_category}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="score-bar-bg">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${(recordDetail.completeness_score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="agent-reasoning">{recordDetail.completeness_reasoning || compDetails.reasoning}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Grounding Evidence from FAISS Benchmark */}
            <div className="column-card">
              <div className="card-header flex-between">
                <div>
                  <h3>Grounding Evidence</h3>
                  <p className="evidence-desc-text">Retrieved semantic evidence from benchmark knowledge base</p>
                </div>
                <span className="evidence-count-badge">
                  {evidenceList.length} Chunks
                </span>
              </div>

              <div className="evidence-cards-list">
                {evidenceList.length > 0 ? (
                  evidenceList.map((evidence, idx) => (
                    <div key={idx} className="evidence-card">
                      <div className="evidence-meta">
                        <div className="evidence-source-tags">
                          <span className="evidence-source-badge">{evidence.source || 'Knowledge Base'}</span>
                          {evidence.category && (
                            <span className="evidence-category-badge">{evidence.category}</span>
                          )}
                        </div>
                        {evidence.score !== undefined && (
                          <div className="evidence-sim-pill">
                            <span>{(evidence.score * 100).toFixed(1)}% Match</span>
                          </div>
                        )}
                      </div>
                      <div className="evidence-text-content">
                        {evidence.question && (
                          <div className="evidence-qa-row">
                            <span className="qa-label">Question:</span>
                            <p className="qa-text">{evidence.question}</p>
                          </div>
                        )}
                        {evidence.answer && (
                          <div className="evidence-qa-row">
                            <span className="qa-label">Ground Truth:</span>
                            <p className="qa-text qa-truth">{evidence.answer}</p>
                          </div>
                        )}
                        {evidence.text && (
                          <p className="evidence-body">{evidence.text}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-evidence">
                    <p>No matching evidence chunks found in FAISS knowledge base.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  // List View (All Records Table)
  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-header-left">
          <button type="button" onClick={onBackToForm} className="history-back-btn">
            <ArrowLeft size={15} />
            <span>Back to Evaluator</span>
          </button>
          <h2 className="history-title">Evaluation Records</h2>
        </div>
        <button type="button" onClick={fetchHistory} className="refresh-btn" title="Refresh">
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="error-card">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="history-loading">
          <RefreshCw size={24} className="spin-icon" />
          <p>Loading evaluation records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="empty-history">
          <Clock size={32} className="empty-icon" />
          <p>No evaluation records found yet.</p>
          <button type="button" onClick={onBackToForm} className="submit-btn history-new-btn">
            Run First Evaluation
          </button>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th className="col-date">Date & Time</th>
                <th className="col-q">Question</th>
                <th className="col-resp">AI Response</th>
                <th className="col-doc">Source</th>
                <th className="col-scores">Scores (R/A/H/C)</th>
                <th className="col-comp">Score</th>
                <th className="col-verd">Verdict</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const v = (r.final_verdict || '').toLowerCase()
                const isPass = v.includes('pass')
                const isNeeds = v.includes('needs') || v.includes('moderate')
                const isUnver = v.includes('unverified')
                const verdictClass = isPass ? 'verdict-pass' : isNeeds ? 'verdict-moderate' : isUnver ? 'verdict-unverified' : 'verdict-fail'

                return (
                  <tr key={r.id} className="history-row">
                    <td className="row-id">#{r.id}</td>
                    <td className="row-date">{formatDate(r.created_at)}</td>
                    <td className="row-q" title={r.question}>
                      {r.question.length > 32 ? r.question.substring(0, 32) + '...' : r.question}
                    </td>
                    <td className="row-resp" title={r.ai_response}>
                      {r.ai_response.length > 36 ? r.ai_response.substring(0, 36) + '...' : r.ai_response}
                    </td>
                    <td className="row-doc">
                      {r.source_document_name ? (
                        <span className="doc-pill" title={r.source_document_name}>
                          PDF
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="row-scores">
                      <span className={r.relevance_score >= 4 ? 'score-green' : r.relevance_score >= 3 ? 'score-yellow' : 'score-red'}>
                        {r.relevance_score?.toFixed(1)}
                      </span>
                      {' / '}
                      <span className={r.accuracy_score >= 4 ? 'score-green' : r.accuracy_score >= 3 ? 'score-yellow' : 'score-red'}>
                        {r.accuracy_score?.toFixed(1)}
                      </span>
                      {' / '}
                      <span className={r.hallucination_score >= 4 ? 'score-green' : r.hallucination_score >= 3 ? 'score-yellow' : 'score-red'}>
                        {r.hallucination_score?.toFixed(1)}
                      </span>
                      {' / '}
                      <span className={r.completeness_score >= 4 ? 'score-green' : r.completeness_score >= 3 ? 'score-yellow' : 'score-red'}>
                        {r.completeness_score?.toFixed(1)}
                      </span>
                    </td>
                    <td className="row-composite">
                      <strong>{r.composite_score?.toFixed(2)}</strong>
                    </td>
                    <td className="row-verdict">
                      <span className={`verdict-pill ${verdictClass}`}>
                        {isPass ? <CheckCircle2 size={12} /> : isNeeds ? <AlertTriangle size={12} /> : isUnver ? <HelpCircle size={12} /> : <XCircle size={12} />}
                        {r.final_verdict}
                      </span>
                    </td>
                    <td className="row-action sticky-col">
                      <button
                        type="button"
                        className="view-record-btn"
                        onClick={() => handleViewRecord(r.id)}
                        title="View Full Evaluation Report"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
