import React, { useState, useEffect, useRef } from 'react'
import {
  Send,
  RotateCcw,
  AlertCircle,
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

export default function EvaluationModule({ selectedEvalId, onClearSelectedEval }) {
  const [question, setQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [referenceAnswer, setReferenceAnswer] = useState('')
  const [pdfFile, setPdfFile] = useState(null)

  const [pipelineStep, setPipelineStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
            relevance: { score: rec.relevance_score, reasoning: rec.relevance_reasoning },
            accuracy: { score: rec.accuracy_score, reasoning: rec.accuracy_reasoning },
            hallucination: { score: rec.hallucination_score, reasoning: rec.hallucination_reasoning },
            completeness: { score: rec.completeness_score, reasoning: rec.completeness_reasoning },
            composite: rec.composite_score,
          },
          verdict: {
            status: rec.final_verdict,
            summary: rec.verdict_summary,
          },
        })
        setPipelineStep(6)
        setStepMessage('Loaded from Neon DB records')
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

      const stepTimer1 = setTimeout(() => {
        setPipelineStep(2)
        setStepMessage('Relevance Judge Agent evaluating query alignment...')
      }, 700)

      const stepTimer2 = setTimeout(() => {
        setPipelineStep(3)
        setStepMessage('Accuracy Judge Agent cross-referencing facts...')
      }, 1500)

      const stepTimer3 = setTimeout(() => {
        setPipelineStep(4)
        setStepMessage('Hallucination Detection Agent checking claims...')
      }, 2300)

      const stepTimer4 = setTimeout(() => {
        setPipelineStep(5)
        setStepMessage('Completeness Judge Agent assessing answer depth...')
      }, 3100)

      const evalRes = await fetch('http://127.0.0.1:8000/api/evaluate', {
        method: 'POST',
        body: formData,
      })

      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      clearTimeout(stepTimer3)
      clearTimeout(stepTimer4)

      if (!evalRes.ok) {
        const errData = await evalRes.json()
        throw new Error(errData.detail || 'Evaluation failed on backend')
      }

      const evalData = await evalRes.json()

      setPipelineStep(6)
      setStepMessage('Evaluation complete • Saved to Neon DB')
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
      <div className="pipeline-controls">
        <div className="module-title-group">
          <span className="module-title">Evaluation Submission Module</span>
          <span className="module-tag">Multi-Agent • RAG Grounded</span>
        </div>

        {(results || question || aiResponse) && (
          <button type="button" onClick={handleReset} className="reset-btn">
            <RotateCcw size={13} />
            <span>New Evaluation</span>
          </button>
        )}
      </div>

      <form onSubmit={handleRunEvaluation} className="pipeline-form">
        <div className="input-group">
          <label className="input-label">
            User Question / Query <span className="req-star">*</span>
          </label>
          <input
            type="text"
            className="text-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter the prompt or question asked..."
            disabled={loading}
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            AI-Generated Response to Validate <span className="req-star">*</span>
          </label>
          <textarea
            className="textarea-input"
            rows={4}
            value={aiResponse}
            onChange={(e) => setAiResponse(e.target.value)}
            placeholder="Paste or enter the AI response to evaluate for hallucination and accuracy..."
            disabled={loading}
          />
        </div>

        <div className="form-grid-2">
          <div className="input-group">
            <label className="input-label flex-between">
              <span>Reference Ground Truth Answer</span>
              <span className="optional-tag">Optional</span>
            </label>
            <input
              type="text"
              className="text-input text-input-sm"
              value={referenceAnswer}
              onChange={(e) => setReferenceAnswer(e.target.value)}
              placeholder="Known factual ground truth answer (if available)..."
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label flex-between">
              <span>Source Document (PDF Only)</span>
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
                <Loader2 size={16} className="spin-icon" />
                <span>Evaluating with Multi-Agent Layer...</span>
              </>
            ) : (
              <>
                <span>Evaluate Response</span>
                <Send size={15} />
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
                <span className="section-badge">Evaluated AI Response & Input</span>
                {results.id && (
                  <span className="db-record-tag">Record #{results.id} • Neon DB</span>
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
                <div className={`verdict-mini-badge ${results.verdict.status === 'PASS' ? 'verdict-mini-pass' : 'verdict-mini-fail'}`}>
                  {results.verdict.status === 'PASS' ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <XCircle size={14} />
                  )}
                  <span>{results.verdict.status}</span>
                </div>
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
              <h3 className="section-subtitle">Specialized Judge Agents (Individual Scores & Reasoning)</h3>
              <span className="text-muted-tag">4 Independent Evaluators</span>
            </div>

            <div className="agent-grid">
              <div className={`agent-card ${getScoreColorClass(results.scores.relevance.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-name-group">
                    <FileCheck size={16} />
                    <h4>Relevance Judge</h4>
                  </div>
                  <span className="agent-score-pill">
                    {results.scores.relevance.score?.toFixed(1)} / 5.0
                  </span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.relevance.score / 5) * 100}%` }}
                  />
                </div>
                <p className="agent-reasoning">{results.scores.relevance.reasoning}</p>
              </div>

              <div className={`agent-card ${getScoreColorClass(results.scores.accuracy.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-name-group">
                    <ShieldCheck size={16} />
                    <h4>Accuracy Judge</h4>
                  </div>
                  <span className="agent-score-pill">
                    {results.scores.accuracy.score?.toFixed(1)} / 5.0
                  </span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.accuracy.score / 5) * 100}%` }}
                  />
                </div>
                <p className="agent-reasoning">{results.scores.accuracy.reasoning}</p>
              </div>

              <div className={`agent-card ${getScoreColorClass(results.scores.hallucination.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-name-group">
                    <ShieldAlert size={16} />
                    <h4>Hallucination Detection</h4>
                  </div>
                  <span className="agent-score-pill">
                    {results.scores.hallucination.score?.toFixed(1)} / 5.0
                  </span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${(results.scores.hallucination.score / 5) * 100}%` }}
                  />
                </div>
                <p className="agent-reasoning">{results.scores.hallucination.reasoning}</p>
              </div>

              <div className={`agent-card ${getScoreColorClass(results.scores.completeness.score)}`}>
                <div className="agent-card-header">
                  <div className="agent-name-group">
                    <Scale size={16} />
                    <h4>Completeness Judge</h4>
                  </div>
                  <span className="agent-score-pill">
                    {results.scores.completeness.score?.toFixed(1)} / 5.0
                  </span>
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
          </div>

          <div className={`verdict-banner ${results.verdict.status === 'PASS' ? 'verdict-banner-pass' : 'verdict-banner-fail'}`}>
            <div className="verdict-banner-left">
              <div className="verdict-icon-wrapper">
                {results.verdict.status === 'PASS' ? (
                  <CheckCircle2 size={26} />
                ) : (
                  <XCircle size={26} />
                )}
              </div>
              <div>
                <div className="verdict-label-row">
                  <span className="verdict-status-title">
                    FINAL VERDICT: {results.verdict.status}
                  </span>
                  <span className="verdict-sub-tag">Synthesized by Verdict Agent</span>
                </div>
                <p className="verdict-summary-text">{results.verdict.summary}</p>
              </div>
            </div>

            <div className="verdict-banner-score">
              <span className="composite-label">Overall Composite</span>
              <span className="composite-number">{results.scores.composite?.toFixed(2)}</span>
              <span className="composite-max">/ 5.00</span>
            </div>
          </div>

          <div className="column-card">
            <div className="card-header flex-between">
              <div>
                <h3>RAG Grounding Evidence (TruthfulQA & SQuAD)</h3>
                <p className="evidence-desc-text">Retrieved semantic evidence used by judge agents to verify factual truth</p>
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
