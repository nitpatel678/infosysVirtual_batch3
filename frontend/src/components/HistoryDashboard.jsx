import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle2, XCircle, ArrowLeft, Eye, RefreshCw, AlertCircle } from 'lucide-react'

export default function HistoryDashboard({ onSelectEvaluation, onBackToForm }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A'
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return isoStr
    }
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-header-left">
          <button type="button" onClick={onBackToForm} className="history-back-btn">
            <ArrowLeft size={15} />
            <span>Back to Evaluator</span>
          </button>
          <h2 className="history-title">Evaluation Records (Neon DB)</h2>
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
          <p>Loading evaluation records from Neon PostgreSQL...</p>
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
                <th>ID</th>
                <th>Date & Time</th>
                <th>Question</th>
                <th>AI Response</th>
                <th>Source Doc</th>
                <th>Scores (Rel / Acc / Hal / Comp)</th>
                <th>Composite</th>
                <th>Verdict</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isPass = r.final_verdict === 'PASS'
                return (
                  <tr key={r.id} className="history-row">
                    <td className="row-id">#{r.id}</td>
                    <td className="row-date">{formatDate(r.created_at)}</td>
                    <td className="row-q" title={r.question}>
                      {r.question.length > 35 ? r.question.substring(0, 35) + '...' : r.question}
                    </td>
                    <td className="row-resp" title={r.ai_response}>
                      {r.ai_response.length > 40 ? r.ai_response.substring(0, 40) + '...' : r.ai_response}
                    </td>
                    <td className="row-doc">
                      {r.source_document_name ? (
                        <span className="doc-pill" title={r.source_document_name}>
                          {r.source_document_name.length > 15 ? r.source_document_name.substring(0, 15) + '...' : r.source_document_name}
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
                      <span className={`verdict-pill ${isPass ? 'verdict-pass' : 'verdict-fail'}`}>
                        {isPass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {r.final_verdict}
                      </span>
                    </td>
                    <td className="row-action">
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() => onSelectEvaluation(r.id)}
                        title="View Full Evaluation"
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
