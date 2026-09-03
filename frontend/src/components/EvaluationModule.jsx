import React, { useState } from 'react'
import { Send, RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
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

export default function EvaluationModule() {
  const [question, setQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [referenceAnswer, setReferenceAnswer] = useState('')

  const [mode, setMode] = useState('auto')
  const [pipelineStep, setPipelineStep] = useState(0)
  const [stepMessage, setStepMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [results, setResults] = useState(null)

  async function handleRunPipeline(e) {
    if (e) e.preventDefault()
    const trimmedQ = question.trim()
    if (!trimmedQ) {
      setError('Please enter a question.')
      return
    }

    setError('')
    setLoading(true)
    setResults(null)

    let finalAiResponse = aiResponse.trim()

    try {
      setPipelineStep(1)
      setStepMessage('Query received')
      await new Promise((r) => setTimeout(r, 200))

      if (mode === 'auto' || !finalAiResponse) {
        setPipelineStep(2)
        setStepMessage('Generating Gemini response...')

        const chatRes = await fetch('http://127.0.0.1:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: trimmedQ }),
        })

        if (!chatRes.ok) {
          const errData = await chatRes.json()
          throw new Error(errData.detail || 'Failed to generate response')
        }

        const chatData = await chatRes.json()
        finalAiResponse = chatData.response
        setAiResponse(finalAiResponse)
        await new Promise((r) => setTimeout(r, 200))
      }

      setPipelineStep(3)
      setStepMessage('Searching benchmark vector index...')

      const evalRes = await fetch('http://127.0.0.1:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmedQ,
          ai_response: finalAiResponse,
          reference_answer: referenceAnswer.trim() || null,
        }),
      })

      if (!evalRes.ok) {
        const errData = await evalRes.json()
        throw new Error(errData.detail || 'Failed to search benchmarks')
      }

      const evalData = await evalRes.json()

      setPipelineStep(4)
      setStepMessage('Completed')
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
    setResults(null)
    setPipelineStep(0)
    setError('')
  }

  return (
    <div className="module-container">
      <div className="pipeline-controls">
        <div className="mode-toggle-group">
          <button
            type="button"
            className={`mode-btn ${mode === 'auto' ? 'mode-btn-active' : ''}`}
            onClick={() => setMode('auto')}
          >
            Auto
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'manual' ? 'mode-btn-active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
        </div>

        {results && (
          <button type="button" onClick={handleReset} className="reset-btn">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <form onSubmit={handleRunPipeline} className="pipeline-form">
        <div className="input-group">
          <label className="input-label">Question</label>
          <div className="input-with-button">
            <input
              type="text"
              className="text-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
            />
            {mode === 'auto' && (
              <button
                type="submit"
                className="submit-icon-btn"
                title="Send"
                disabled={loading || !question.trim()}
              >
                {loading ? <Loader2 size={16} className="spin-icon" /> : <Send size={16} />}
              </button>
            )}
          </div>
        </div>

        {mode === 'manual' && (
          <div className="input-group">
            <label className="input-label">AI Response</label>
            <textarea
              className="textarea-input"
              rows={3}
              value={aiResponse}
              onChange={(e) => setAiResponse(e.target.value)}
              placeholder="Enter response to validate..."
              disabled={loading}
            />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Reference Answer (optional)</label>
          <input
            type="text"
            className="text-input text-input-sm"
            value={referenceAnswer}
            onChange={(e) => setReferenceAnswer(e.target.value)}
            placeholder="Ground truth answer (optional)..."
            disabled={loading}
          />
        </div>

        {mode === 'manual' && (
          <div className="submit-action-row">
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !question.trim() || !aiResponse.trim()}
            >
              {loading ? (
                <Loader2 size={16} className="spin-icon" />
              ) : (
                <>
                  <span>Submit</span>
                  <Send size={15} />
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="error-card">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </form>

      {pipelineStep > 0 && (
        <PipelineTracker currentStep={pipelineStep} activeStepMessage={stepMessage} />
      )}

      {results && (
        <div className="results-container">
          <div className="results-header">
            <h2 className="results-title">Results</h2>
          </div>

          <div className="results-grid">
            <div className="result-column">
              <div className="column-card">
                <div className="card-header">
                  <h3>AI Response</h3>
                </div>

                <div className="ai-response-content">
                  {renderFormattedText(results.input.ai_response)}
                </div>

                {results.input.reference_answer && (
                  <div className="card-sub-block">
                    <span className="sub-block-label">Ground Truth:</span>
                    <p className="sub-block-text">{results.input.reference_answer}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="result-column">
              <div className="column-card">
                <div className="card-header">
                  <h3>Retrieved Evidence ({results.retrieved_evidence ? results.retrieved_evidence.length : 0})</h3>
                </div>

                <div className="evidence-cards-list">
                  {results.retrieved_evidence && results.retrieved_evidence.length > 0 ? (
                    results.retrieved_evidence.map((evidence, idx) => (
                      <EvidenceCard key={idx} evidence={evidence} index={idx} />
                    ))
                  ) : (
                    <div className="empty-evidence">
                      <p>No matching evidence chunks found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
