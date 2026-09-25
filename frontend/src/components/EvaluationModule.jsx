import React, { useState, useEffect, useRef } from 'react'
import {
  Send,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileUp,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Scale,
  FileCheck,
  Database,
  Layers,
  Sparkles,
  GitCompare,
  HelpCircle,
} from 'lucide-react'
import EvidenceCard from './EvidenceCard'
import PipelineTracker from './PipelineTracker'

function formatInline(text) {
  if (!text) return null
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function renderFormattedText(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return <div key={idx} className="formatted-spacer" />
    }
    if (trimmed.startsWith('### ')) {
      return <h4 key={idx} className="formatted-h4">{formatInline(trimmed.slice(4))}</h4>
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={idx} className="formatted-h3">{formatInline(trimmed.slice(3))}</h3>
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      return (
        <div key={idx} className="formatted-bullet">
          <span className="bullet-dot">•</span>
          <span>{formatInline(trimmed.slice(2))}</span>
        </div>
      )
    }
    return <p key={idx} className="formatted-p">{formatInline(line)}</p>
  })
}

function getScoreColorClass(score) {
  if (score >= 4.0) return 'score-card-green'
  if (score >= 3.0) return 'score-card-yellow'
  return 'score-card-red'
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

export default function EvaluationModule({ selectedEvalId, onClearSelectedEval }) {
  const [question, setQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [referenceAnswer, setReferenceAnswer] = useState('')
  const [pdfFile, setPdfFile] = useState(null)

  const [pipelineStep, setPipelineStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [activeAgentTab, setActiveAgentTab] = useState('relevance')
  const [results, setResults] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (selectedEvalId) {
      loadEvaluationById(selectedEvalId)
    }
  }, [selectedEvalId])

  async function loadEvaluationById(id) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/history/${id}`)
      if (!res.ok) {
        throw new Error('Failed to load evaluation details from database')
      }
      const data = await res.json()
      const rec = data.record
      if (rec) {
        setQuestion(rec.question || '')
        setAiResponse(rec.ai_response || '')
        setReferenceAnswer(rec.reference_answer || '')
        setResults({
          id: rec.id,
          created_at: rec.created_at,
          input: {
            question: rec.question,
            ai_response: rec.ai_response,
            reference_answer: rec.reference_answer,
            source_document_name: rec.source_document_name,
          },
          retrieved_evidence: rec.retrieved_evidence || [],
          scores: {
            relevance: {
              score: rec.relevance_score,
              reasoning: rec.relevance_reasoning,
              ...(rec.relevance_details || {}),
            },
            accuracy: {
              score: rec.accuracy_score,
              reasoning: rec.accuracy_reasoning,
              ...(rec.accuracy_details || {}),
            },
            hallucination: {
              score: rec.hallucination_score,
              reasoning: rec.hallucination_reasoning,
              ...(rec.hallucination_details || {}),
            },
            completeness: {
              score: rec.completeness_score,
              reasoning: rec.completeness_reasoning,
              ...(rec.completeness_details || {}),
            },
            composite: rec.composite_score,
          },
          verdict: {
            status: rec.final_verdict,
            summary: rec.verdict_summary,
            ...(rec.verdict_details || {}),
          },
        })
        setPipelineStep(4)
        setStepMessage('Loaded from evaluation records')
      }
    } catch (err) {
      setError(err.message || 'Error loading record.')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF documents are allowed.')
        setPdfFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setError('')
      setPdfFile(file)
    }
  }

  function handleRemoveFile() {
    setPdfFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleRunEvaluation(e) {
    if (e) e.preventDefault()
    const trimmedQ = question.trim()
    const trimmedResp = aiResponse.trim()

    if (!trimmedQ) {
      setError('Please enter the user question / query.')
      return
    }
    if (!trimmedResp) {
      setError('Please enter the AI response to be evaluated.')
      return
    }

    setError('')
    setLoading(true)
    setResults(null)

    const formData = new FormData()
    formData.append('question', trimmedQ)
    formData.append('ai_response', trimmedResp)
    if (referenceAnswer.trim()) {
      formData.append('reference_answer', referenceAnswer.trim())
    }
    if (pdfFile) {
      formData.append('source_document', pdfFile)
    }

    try {
      setPipelineStep(1)
      setStepMessage('Extracting RAG grounding chunks from benchmark knowledge base...')

      const parallelTimer = setTimeout(() => {
        setPipelineStep(2)
        setStepMessage('All 4 Judge Agents evaluating concurrently in parallel...')
      }, 800)

      const evalRes = await fetch('http://127.0.0.1:8000/api/evaluate', {
        method: 'POST',
        body: formData,
      })

      clearTimeout(parallelTimer)

      if (!evalRes.ok) {
        const errData = await evalRes.json()
        throw new Error(errData.detail || 'Evaluation failed on backend')
      }

      const evalData = await evalRes.json()

      setPipelineStep(3)
      setStepMessage('Converging agent verdicts & saving evaluation to database...')

      await new Promise((r) => setTimeout(r, 650))

      setPipelineStep(4)
      setStepMessage('Evaluation complete • Saved to database')
      setResults(evalData)
    } catch (err) {
      setError(err.message || 'Could not connect to the backend server.')
      setPipelineStep(0)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setQuestion('')
    setAiResponse('')
    setReferenceAnswer('')
    setPdfFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setResults(null)
    setPipelineStep(0)
    setError('')
    if (onClearSelectedEval) onClearSelectedEval()
  }

  return (
    <div className="module-container">
      <form onSubmit={handleRunEvaluation} className="pipeline-form">
        <div className="form-header">
          <span className="form-title">Evaluate Response</span>
          {(results || question || aiResponse) && (
            <button type="button" onClick={handleReset} className="reset-btn">
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
        <div className="input-group">
          <label className="input-label">
            User Question <span className="req-star">*</span>
          </label>
          <input
            type="text"
            className="text-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type question here..."
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            AI Response to Validate <span className="req-star">*</span>
          </label>
          <textarea
            className="textarea-input"
            rows={4}
            value={aiResponse}
            onChange={(e) => setAiResponse(e.target.value)}
            placeholder="Paste AI response to evaluate..."
            disabled={loading}
          />
        </div>

        <div className="form-grid-2">
          <div className="input-group">
            <label className="input-label flex-between">
              <span>Reference Answer</span>
              <span className="optional-tag">Optional</span>
            </label>
            <input
              type="text"
              className="text-input text-input-sm"
              value={referenceAnswer}
              onChange={(e) => setReferenceAnswer(e.target.value)}
              placeholder="Reference ground truth (optional)..."
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label flex-between">
              <span>Source Document (PDF)</span>
              <span className="optional-tag">Optional</span>
            </label>
            <div className="pdf-upload-container">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                style={{ display: 'none' }}
                disabled={loading}
              />
              {pdfFile ? (
                <div className="pdf-file-badge">
                  <FileText size={15} />
                  <span className="pdf-filename" title={pdfFile.name}>
                    {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="pdf-remove-btn"
                    title="Remove PDF"
                    disabled={loading}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pdf-select-btn"
                  disabled={loading}
                >
                  <FileUp size={14} />
                  <span>Choose PDF Document</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-card">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="submit-action-row">
          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !question.trim() || !aiResponse.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spin-icon" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Evaluate</span>
                <Send size={14} />
              </>
            )}
          </button>
        </div>
      </form>

      {pipelineStep > 0 && (
        <PipelineTracker currentStep={pipelineStep} activeStepMessage={stepMessage} />
      )}

      {results && (
        <div className="results-container">
          <div className="top-response-card">
            <div className="top-response-header">
              <div className="top-response-meta">
                <span className="section-badge">Evaluated AI Response</span>
                {results.id && (
                  <span className="db-record-tag">Record #{results.id}</span>
                )}
              </div>

              <div className="top-score-box">
                <div className="top-score-details">
                  <span className="top-score-title">Composite Score</span>
                  <div className="top-score-val-row">
                    <span className="top-score-number">{results.scores.composite?.toFixed(2)}</span>
                    <span className="top-score-scale">/ 5.00</span>
                  </div>
                </div>
                {(() => {
                  const vStatus = results.verdict.status || results.verdict.final_verdict || 'Pass'
                  const vLow = vStatus.toLowerCase()
                  const isPass = vLow.includes('pass') && !vLow.includes('needs') && !vLow.includes('fail')
                  const isConflict = vLow.includes('conflict')
                  const isInsufficient = vLow.includes('insufficient') || vLow.includes('unverified') || vLow.includes('more info')
                  const isNeeds = vLow.includes('needs') || vLow.includes('moderate')

                  const badgeClass = isPass
                    ? 'verdict-mini-pass'
                    : isConflict
                    ? 'verdict-mini-conflict'
                    : isInsufficient
                    ? 'verdict-mini-insufficient'
                    : isNeeds
                    ? 'verdict-mini-warn'
                    : 'verdict-mini-fail'

                  return (
                    <div className={`verdict-mini-badge ${badgeClass}`}>
                      {isPass ? (
                        <CheckCircle2 size={14} />
                      ) : isConflict ? (
                        <GitCompare size={14} />
                      ) : isInsufficient ? (
                        <HelpCircle size={14} />
                      ) : isNeeds ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      <span>{vStatus.toUpperCase()}</span>
                    </div>
                  )
                })()}
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-new-query"
                  title="Clear and evaluate a new query"
                >
                  <RotateCcw size={13} />
                  <span>New Query</span>
                </button>
              </div>
            </div>

            <div className="ai-response-content">
              {renderFormattedText(results.input.ai_response)}
            </div>

            <div className="context-subgrid">
              <div className="context-item">
                <span className="context-label">User Query:</span>
                <p className="context-value">{results.input.question}</p>
              </div>

              {results.input.reference_answer && (
                <div className="context-item">
                  <span className="context-label">Reference Ground Truth:</span>
                  <p className="context-value">{results.input.reference_answer}</p>
                </div>
              )}

              {results.input.source_document_name && (
                <div className="context-item">
                  <span className="context-label">Source Document:</span>
                  <p className="context-value">{results.input.source_document_name}</p>
                </div>
              )}
            </div>
          </div>

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
                <span className="tab-score-pill">{results.scores.relevance.score?.toFixed(1)}</span>
              </button>
              <button
                type="button"
                className={`agent-tab-btn ${activeAgentTab === 'accuracy' ? 'tab-active' : ''}`}
                onClick={() => setActiveAgentTab('accuracy')}
              >
                <ShieldCheck size={14} />
                <span>Accuracy Judge</span>
                <span className="tab-score-pill">{results.scores.accuracy.score?.toFixed(1)}</span>
              </button>
              <button
                type="button"
                className={`agent-tab-btn ${activeAgentTab === 'hallucination' ? 'tab-active' : ''}`}
                onClick={() => setActiveAgentTab('hallucination')}
              >
                <ShieldAlert size={14} />
                <span>Hallucination Agent</span>
                <span className="tab-score-pill">{results.scores.hallucination.score?.toFixed(1)}</span>
              </button>
              <button
                type="button"
                className={`agent-tab-btn ${activeAgentTab === 'completeness' ? 'tab-active' : ''}`}
                onClick={() => setActiveAgentTab('completeness')}
              >
                <Scale size={14} />
                <span>Completeness Judge</span>
                <span className="tab-score-pill">{results.scores.completeness.score?.toFixed(1)}</span>
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

            {activeAgentTab === 'relevance' && (
              <div className={`agent-card agent-card-full ${getScoreColorClass(results.scores.relevance.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-header-top">
                    <div className="agent-name-group">
                      <FileCheck size={16} />
                      <h4>Relevance Judge</h4>
                    </div>
                    <span className="agent-score-pill">
                      {results.scores.relevance.score?.toFixed(1)} / 5.0
                    </span>
                  </div>
                  {results.scores.relevance.relevance_category && (
                    <div className="agent-header-badges">
                      <span className="agent-sub-pill">
                        {results.scores.relevance.relevance_category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.relevance.score / 5) * 100}%` }}
                  />
                </div>
                <p className="agent-reasoning">{results.scores.relevance.reasoning}</p>

                {results.scores.relevance.key_alignment_points && results.scores.relevance.key_alignment_points.length > 0 && (
                  <div className="agent-sub-section">
                    <span className="agent-sub-title">Direct Question Alignments:</span>
                    <ul className="agent-sub-list">
                      {results.scores.relevance.key_alignment_points.map((pt, i) => (
                        <li key={i} className="agent-sub-item item-align">
                          <span className="sub-bullet">✓</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.scores.relevance.missed_aspects && results.scores.relevance.missed_aspects.length > 0 && (
                  <div className="agent-sub-section">
                    <span className="agent-sub-title">Missed Query Nuances:</span>
                    <ul className="agent-sub-list">
                      {results.scores.relevance.missed_aspects.map((pt, i) => (
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

            {activeAgentTab === 'accuracy' && (
              <div className={`agent-card agent-card-full ${getScoreColorClass(results.scores.accuracy.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-header-top">
                    <div className="agent-name-group">
                      <ShieldCheck size={16} />
                      <h4>Accuracy Judge</h4>
                    </div>
                    <span className="agent-score-pill">
                      {results.scores.accuracy.score?.toFixed(1)} / 5.0
                    </span>
                  </div>
                  {results.scores.accuracy.accuracy_category && (
                    <div className="agent-header-badges">
                      <span className={`agent-sub-pill ${getCategoryBadgeClass(getAccCategory(results.scores.accuracy.score, results.scores.accuracy.accuracy_category, results.scores.accuracy.contradiction_detected))}`}>
                        {getAccCategory(results.scores.accuracy.score, results.scores.accuracy.accuracy_category, results.scores.accuracy.contradiction_detected)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.accuracy.score / 5) * 100}%` }}
                  />
                </div>

                {results.scores.accuracy.contradiction_detected && (
                  <div className="agent-notice-banner notice-contradiction">
                    <AlertTriangle size={14} />
                    <span><strong>Contradiction Warning:</strong> Reference ground truth directly conflicts with retrieved benchmark chunks.</span>
                  </div>
                )}

                {results.scores.accuracy.is_insufficient_evidence && (
                  <div className="agent-notice-banner notice-insufficient">
                    <AlertCircle size={14} />
                    <span><strong>Closed-World Grounding Notice:</strong> No reference answer or matching knowledge base evidence was available. Score is marked Unverified.</span>
                  </div>
                )}

                <p className="agent-reasoning">{results.scores.accuracy.reasoning}</p>

                {results.scores.accuracy.verified_claims && results.scores.accuracy.verified_claims.length > 0 && (
                  <div className="agent-sub-section">
                    <span className="agent-sub-title">Fact-Checked Claims ({results.scores.accuracy.verified_claims.length}):</span>
                    <div className="claims-list">
                      {results.scores.accuracy.verified_claims.map((c, i) => (
                        <div key={i} className="claim-box">
                          <div className="claim-header">
                            <span className={`claim-badge badge-${c.verdict?.toLowerCase()}`}>
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
              </div>
            )}

            {activeAgentTab === 'hallucination' && (
              <div className={`agent-card agent-card-full ${getScoreColorClass(results.scores.hallucination.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-header-top">
                    <div className="agent-name-group">
                      <ShieldAlert size={16} />
                      <h4>Hallucination Detection Agent</h4>
                    </div>
                    <span className="agent-score-pill">
                      {results.scores.hallucination.score?.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="agent-header-badges">
                    {results.scores.hallucination.hallucination_level && (
                      <span className="agent-sub-pill">
                        {results.scores.hallucination.hallucination_level}
                      </span>
                    )}
                    <span className={`hal-status-tag ${(!results.scores.hallucination.hallucination_count || results.scores.hallucination.hallucination_count === 0) ? 'hal-tag-clean' : 'hal-tag-warn'}`}>
                      {(!results.scores.hallucination.hallucination_count || results.scores.hallucination.hallucination_count === 0)
                        ? '0 Flagged Statements'
                        : `${results.scores.hallucination.hallucination_count} Statement(s) Flagged`}
                    </span>
                  </div>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.hallucination.score / 5) * 100}%` }}
                  />
                </div>

                {results.scores.hallucination.is_insufficient_evidence && (
                  <div className="agent-notice-banner notice-insufficient">
                    <AlertCircle size={15} />
                    <span><strong>Closed-World Evaluation Notice:</strong> Grounding status cannot be established because no reference answer was provided and no matching benchmark chunks were retrieved.</span>
                  </div>
                )}

                <p className="agent-reasoning">{results.scores.hallucination.reasoning}</p>

                {results.scores.hallucination.flagged_claims && results.scores.hallucination.flagged_claims.length > 0 && (
                  <div className="agent-sub-section">
                    <div className="flex-between">
                      <span className="agent-sub-title">Statement-by-Statement Hallucination Audit ({results.scores.hallucination.flagged_claims.length} claims):</span>
                      <span className="section-hint-badge">Cross-referenced against RAG & Ground Truth</span>
                    </div>
                    <div className="claims-list">
                      {results.scores.hallucination.flagged_claims.map((c, i) => {
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

            {activeAgentTab === 'completeness' && (
              <div className={`agent-card agent-card-full ${getScoreColorClass(results.scores.completeness.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-header-top">
                    <div className="agent-name-group">
                      <Scale size={16} />
                      <h4>Completeness Judge</h4>
                    </div>
                    <span className="agent-score-pill">
                      {results.scores.completeness.score?.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="agent-header-badges">
                    {results.scores.completeness.completeness_category && (
                      <span className="agent-sub-pill">
                        {results.scores.completeness.completeness_category}
                      </span>
                    )}
                    {results.scores.completeness.source_conflict_detected && (
                      <span className="conflict-tag-pill" title="Discrepancy detected between Reference Ground Truth and Benchmark Knowledge Base">
                        Conflict in Ground Truth
                      </span>
                    )}
                  </div>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.completeness.score / 5) * 100}%` }}
                  />
                </div>
                <p className="agent-reasoning">{results.scores.completeness.reasoning}</p>

                {results.scores.completeness.identified_requirements && results.scores.completeness.identified_requirements.length > 0 && (
                  <div className="agent-sub-section">
                    <span className="agent-sub-title">Identified Question Requirements:</span>
                    <ul className="agent-sub-list">
                      {results.scores.completeness.identified_requirements.map((req, i) => (
                        <li key={i} className="agent-sub-item item-req">
                          <span className="sub-bullet">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.scores.completeness.addressed_aspects && results.scores.completeness.addressed_aspects.length > 0 && (
                  <div className="agent-sub-section">
                    <span className="agent-sub-title">Addressed Aspects:</span>
                    <ul className="agent-sub-list">
                      {results.scores.completeness.addressed_aspects.map((pt, i) => (
                        <li key={i} className="agent-sub-item item-align">
                          <span className="sub-bullet">✓</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.scores.completeness.missing_aspects && results.scores.completeness.missing_aspects.length > 0 && (
                  <div className="agent-sub-section">
                    <span className="agent-sub-title">Missing / Omitted Aspects:</span>
                    <ul className="agent-sub-list">
                      {results.scores.completeness.missing_aspects.map((pt, i) => (
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

            {activeAgentTab === 'all' && (
              <div className="agent-grid-2col">
                <div className={`agent-card ${getScoreColorClass(results.scores.relevance.score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <FileCheck size={16} />
                        <h4>Relevance Judge</h4>
                      </div>
                      <span className="agent-score-pill">
                        {results.scores.relevance.score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    {results.scores.relevance.relevance_category && (
                      <div className="agent-header-badges">
                        <span className="agent-sub-pill">
                          {results.scores.relevance.relevance_category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(results.scores.relevance.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="agent-reasoning">{results.scores.relevance.reasoning}</p>
                </div>

                <div className={`agent-card ${getScoreColorClass(results.scores.hallucination.score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <ShieldAlert size={16} />
                        <h4>Hallucination Detection</h4>
                      </div>
                      <span className="agent-score-pill">
                        {results.scores.hallucination.score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="agent-header-badges">
                      {results.scores.hallucination.hallucination_level && (
                        <span className="agent-sub-pill">
                          {results.scores.hallucination.hallucination_level}
                        </span>
                      )}
                      <span className={`hal-status-tag ${(!results.scores.hallucination.hallucination_count || results.scores.hallucination.hallucination_count === 0) ? 'hal-tag-clean' : 'hal-tag-warn'}`}>
                        {(!results.scores.hallucination.hallucination_count || results.scores.hallucination.hallucination_count === 0)
                          ? '0 Ungrounded'
                          : `${results.scores.hallucination.hallucination_count} Flagged`}
                      </span>
                    </div>
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(results.scores.hallucination.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="agent-reasoning">{results.scores.hallucination.reasoning}</p>
                </div>

                <div className={`agent-card ${getScoreColorClass(results.scores.accuracy.score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <ShieldCheck size={16} />
                        <h4>Accuracy Judge</h4>
                      </div>
                      <span className="agent-score-pill">
                        {results.scores.accuracy.score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                    {results.scores.accuracy.accuracy_category && (
                      <div className="agent-header-badges">
                        <span className={`agent-sub-pill ${getCategoryBadgeClass(getAccCategory(results.scores.accuracy.score, results.scores.accuracy.accuracy_category, results.scores.accuracy.contradiction_detected))}`}>
                          {getAccCategory(results.scores.accuracy.score, results.scores.accuracy.accuracy_category, results.scores.accuracy.contradiction_detected)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(results.scores.accuracy.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="agent-reasoning">{results.scores.accuracy.reasoning}</p>
                </div>

                <div className={`agent-card ${getScoreColorClass(results.scores.completeness.score)}`}>
                  <div className="agent-card-header">
                    <div className="agent-header-top">
                      <div className="agent-name-group">
                        <Scale size={16} />
                        <h4>Completeness Judge</h4>
                      </div>
                      <span className="agent-score-pill">
                        {results.scores.completeness.score?.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>
                  <div className="score-bar-bg">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${(results.scores.completeness.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="agent-reasoning">{results.scores.completeness.reasoning}</p>
                </div>
              </div>
            )}
          </div>


          {(() => {
            const vStatus = results.verdict.status || results.verdict.final_verdict || 'Pass'
            const vLow = vStatus.toLowerCase()
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

            const vTag = results.verdict.verdict_tag
            const qualityGates = results.verdict.quality_gates

            return (
              <div className={`verdict-banner ${bannerClass}`}>
                <div className="verdict-banner-left">
                  <div className="verdict-icon-wrapper">
                    {isPass ? (
                      <CheckCircle2 size={26} />
                    ) : isConflict ? (
                      <GitCompare size={26} />
                    ) : isInsufficient ? (
                      <HelpCircle size={26} />
                    ) : isNeeds ? (
                      <AlertTriangle size={26} />
                    ) : (
                      <XCircle size={26} />
                    )}
                  </div>
                  <div>
                    <div className="verdict-label-row">
                      <span className="verdict-status-title">
                        FINAL VERDICT: {vStatus}
                      </span>
                      {vTag && vTag !== vStatus && (
                        <span className="verdict-tag-pill" title="Descriptive Quality Classification">
                          {vTag}
                        </span>
                      )}
                      {results.verdict.source_conflict_detected && (
                        <span className="conflict-tag-pill" title="Discrepancy detected between Reference Answer and RAG evidence">
                          Conflict in Ground Truth
                        </span>
                      )}
                      <span className="formula-tag-pill">
                        Weights: 25% Rel • 30% Acc • 25% Hal • 20% Comp
                      </span>
                    </div>

                    <p className="verdict-summary-text">{results.verdict.summary || results.verdict.verdict_summary}</p>

                    {qualityGates && Object.keys(qualityGates).length > 0 && (
                      <div className="quality-gates-container">
                        <div className="quality-gates-header">
                          Multi-Metric Quality Gates ({results.verdict.gates_passed ?? 0}/{results.verdict.total_gates ?? 5} Cleared):
                        </div>
                        <div className="quality-gates-pills">
                          {Object.entries(qualityGates).map(([key, gate]) => (
                            <span
                              key={key}
                              className={`quality-gate-pill ${gate.passed ? 'gate-cleared' : 'gate-breached'}`}
                              title={gate.reason}
                            >
                              {gate.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              <span>{gate.name}: {gate.passed ? 'Passed' : 'Breached'}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {results.verdict.major_issues && results.verdict.major_issues.length > 0 && (
                      <div className="verdict-issues-row">
                        <span className="issues-label">Key Issues:</span>
                        {results.verdict.major_issues.map((iss, i) => (
                          <span key={i} className="issue-pill">⚠ {iss}</span>
                        ))}
                      </div>
                    )}

                    {results.verdict.strengths && results.verdict.strengths.length > 0 && (
                      <div className="verdict-issues-row">
                        <span className="issues-label">Strengths:</span>
                        {results.verdict.strengths.map((str, i) => (
                          <span key={i} className="strength-pill">✓ {str}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="verdict-banner-score">
                  <span className="composite-label">Weighted Overall</span>
                  <span className="composite-number">{results.scores.composite?.toFixed(2)}</span>
                  <span className="composite-max">/ 5.00</span>
                </div>
              </div>
            )
          })()}

          <div className="column-card">
            <div className="card-header flex-between">
              <div>
                <h3>Grounding Evidence</h3>
                <p className="evidence-desc-text">Retrieved semantic evidence from benchmark knowledge base</p>
              </div>
              <span className="evidence-count-badge">
                {results.retrieved_evidence ? results.retrieved_evidence.length : 0} Chunks
              </span>
            </div>

            <div className="evidence-cards-list">
              {results.retrieved_evidence && results.retrieved_evidence.length > 0 ? (
                results.retrieved_evidence.map((evidence, idx) => (
                  <EvidenceCard key={idx} evidence={evidence} index={idx} />
                ))
              ) : (
                <div className="empty-evidence">
                  <p>No matching evidence chunks found in FAISS knowledge base.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
