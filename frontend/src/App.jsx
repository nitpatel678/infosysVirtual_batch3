import React, { useState } from 'react'
import Navbar from './components/Navbar'
import EvaluationModule from './components/EvaluationModule'
import HistoryDashboard from './components/HistoryDashboard'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState('evaluate')
  const [selectedEvalId, setSelectedEvalId] = useState(null)

  function handleNavigateHome() {
    setSelectedEvalId(null)
    setActiveView('evaluate')
  }

  function handleSelectFromHistory(evalId) {
    setSelectedEvalId(evalId)
    setActiveView('evaluate')
  }

  function handleClearSelected() {
    setSelectedEvalId(null)
  }

  return (
    <div className="app-layout">
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onNavigateHome={handleNavigateHome}
      />

      <main className="main-content">
        <section className="hero-section">
          <h1 className="hero-heading">AI Response Validator</h1>
          <p className="hero-subheading">
            Evaluate accuracy, hallucination, and factual grounding against reference benchmarks.
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
          <div className="footer-details">Project #M-3-5 • Nitin Patel</div>
        </div>
      </footer>
    </div>
  )
}

export default App
