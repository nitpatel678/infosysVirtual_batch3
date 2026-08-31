import { useState } from 'react'
import './App.css'

function App() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Something went wrong')
      } else {
        setResponse(data.response)
      }
    } catch (err) {
      setError('Could not connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Response Validation System</h1>
        <p>Ask a question and get an AI-generated response</p>
      </header>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter your question..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Asking...' : 'Ask AI'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      <div className="response-box">
        <h2>AI Response</h2>
        {loading ? (
          <p className="loading">Generating response...</p>
        ) : response ? (
          <div className="content">{response}</div>
        ) : (
          <p className="placeholder">Response will appear here</p>
        )}
      </div>
    </div>
  )
}

export default App
