import React, { useState } from 'react'
import Navbar from './components/Navbar'
import EvaluationModule from './components/EvaluationModule'
import HistoryDashboard from './components/HistoryDashboard'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState('evaluate')
  const [selectedEvalId, setSelectedEvalId] = useState(null)

  function handleSelectFromHistory(evalId) {
    setSelectedEvalId(evalId)
    setActiveView('evaluate')
  }

  function handleClearSelected() {
    setSelectedEvalId(null)
  }

  return (
    <div className="app-layout">
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      <main className="main-content">
        <section className="hero-section">
          <h1 className="hero-heading">AI Response Validation System</h1>
          <p className="hero-subheading">
            Multi-agent evaluation platform verifying AI response credibility, hallucination, and factual grounding against benchmark datasets and source documents.
          </p>
        </section>

        {activeView === 'history' ? (
          <HistoryDashboard
            onSelectEvaluation={handleSelectFromHistory}
            onBackToForm={() => setActiveView('evaluate')}
          />
        ) : (
          <EvaluationModule
            selectedEvalId={selectedEvalId}
            onClearSelectedEval={handleClearSelected}
          />
        )}
      </main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-title">Infosys Springboard Virtual Internship</div>
          <div className="footer-details">Project #M-3-5 • Nitin Patel • Neon DB Integration</div>
        </div>
      </footer>
    </div>
  )
}

export default App
