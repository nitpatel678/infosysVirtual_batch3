import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('ask')

  // Ask AI state
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  // Evaluate state
  const [evalQuestion, setEvalQuestion] = useState('')
  const [evalAiResponse, setEvalAiResponse] = useState('')
  const [evalReference, setEvalReference] = useState('')
  const [evalSource, setEvalSource] = useState('')
  const [evalResult, setEvalResult] = useState(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [evalError, setEvalError] = useState('')

  async function handleAskSubmit(e) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return

    setChatLoading(true)
    setChatError('')
    setResponse('')

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setChatError(data.detail || 'Something went wrong')
      } else {
        setResponse(data.response)
      }
    } catch (err) {
      setChatError('Could not connect to the server')
    } finally {
      setChatLoading(false)
    }
  }

  async function handleEvalSubmit(e) {
    e.preventDefault()
    const q = evalQuestion.trim()
    const ai = evalAiResponse.trim()
    if (!q || !ai) return

    setEvalLoading(true)
    setEvalError('')
    setEvalResult(null)

    try {
      const res = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          ai_response: ai,
          reference_answer: evalReference.trim() || null,
          source_material: evalSource.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEvalError(data.detail || 'Something went wrong')
      } else {
        setEvalResult(data)
      }
    } catch (err) {
      setEvalError('Could not connect to the server')
    } finally {
      setEvalLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Response Validation System</h1>
        <p>Ask AI questions or evaluate AI-generated responses</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'ask' ? 'active' : ''}`}
          onClick={() => setActiveTab('ask')}
        >
          Ask AI
        </button>
        <button
          className={`tab ${activeTab === 'evaluate' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluate')}
        >
          Evaluate Response
        </button>
      </div>

      {activeTab === 'ask' && (
        <div className="tab-content">
          <form className="chat-form" onSubmit={handleAskSubmit}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question..."
              disabled={chatLoading}
            />
            <button type="submit" disabled={chatLoading || !question.trim()}>
              {chatLoading ? 'Asking...' : 'Ask AI'}
            </button>
          </form>

          {chatError && <p className="error-message">{chatError}</p>}

          <div className="response-box">
            <h2>AI Response</h2>
            {chatLoading ? (
              <p className="loading">Generating response...</p>
            ) : response ? (
              <div className="content">{response}</div>
            ) : (
              <p className="placeholder">Response will appear here</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'evaluate' && (
        <div className="tab-content">
          <form className="eval-form" onSubmit={handleEvalSubmit}>
            <div className="form-group">
              <label>Question *</label>
              <input
                type="text"
                value={evalQuestion}
                onChange={(e) => setEvalQuestion(e.target.value)}
                placeholder="Enter the question that was asked..."
                disabled={evalLoading}
              />
            </div>

            <div className="form-group">
              <label>AI Response *</label>
              <textarea
                value={evalAiResponse}
                onChange={(e) => setEvalAiResponse(e.target.value)}
                placeholder="Paste the AI-generated response to evaluate..."
                rows={4}
                disabled={evalLoading}
              />
            </div>

            <div className="form-group">
              <label>Reference Answer (optional)</label>
              <textarea
                value={evalReference}
                onChange={(e) => setEvalReference(e.target.value)}
                placeholder="Provide a known correct answer for comparison..."
                rows={3}
                disabled={evalLoading}
              />
            </div>

            <div className="form-group">
              <label>Source Material (optional)</label>
              <textarea
                value={evalSource}
                onChange={(e) => setEvalSource(e.target.value)}
                placeholder="Provide source documents or reference material..."
                rows={3}
                disabled={evalLoading}
              />
            </div>

            <button
              type="submit"
              className="eval-submit"
              disabled={evalLoading || !evalQuestion.trim() || !evalAiResponse.trim()}
            >
              {evalLoading ? 'Evaluating...' : 'Submit for Evaluation'}
            </button>
          </form>

          {evalError && <p className="error-message">{evalError}</p>}

          {evalResult && (
            <div className="eval-result">
              <h2>Evaluation Result</h2>
              <div className="result-section">
                <h3>Input Received</h3>
                <p><strong>Question:</strong> {evalResult.input.question}</p>
                <p><strong>AI Response:</strong> {evalResult.input.ai_response}</p>
                {evalResult.input.reference_answer && (
                  <p><strong>Reference:</strong> {evalResult.input.reference_answer}</p>
                )}
                {evalResult.input.source_material && (
                  <p><strong>Source:</strong> {evalResult.input.source_material}</p>
                )}
              </div>

              <div className="result-section">
                <h3>Scores</h3>
                <div className="scores-grid">
                  {Object.entries(evalResult.scores).map(([key, value]) => (
                    <div key={key} className="score-item">
                      <span className="score-label">{key}</span>
                      <span className="score-value">{value ?? 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-section">
                <h3>Verdict</h3>
                <p>{evalResult.verdict ?? 'Evaluation agents not yet connected'}</p>
              </div>

              <p className="result-note">{evalResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
