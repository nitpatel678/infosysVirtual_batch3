import React from 'react'
import Navbar from './components/Navbar'
import EvaluationModule from './components/EvaluationModule'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <section className="hero-section">
          <div className="hero-badge">AI Hallucination Evaluator</div>
          <h1 className="hero-heading">
            AI Response Validation <span className="hero-heading-dim">& Grounding Engine</span>
          </h1>
          <p className="hero-subheading">
            Response extraction and knowledge grounding powered by Google Gemini,
            Sentence Transformers, and FAISS vector retrieval over TruthfulQA and SQuAD benchmarks.
          </p>
        </section>

        <EvaluationModule />
      </main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="footer-title">Infosys Springboard Virtual Internship</div>
            <div className="footer-details">
              Project Code: <strong>#M-3-5</strong> • Intern: <strong>Nitin Patel</strong> • Batch: <strong>3</strong> • Mentor: <strong>Devender Pratap</strong>
            </div>
          </div>
          <div className="footer-right">
            <a
              href="https://github.com/nitpatel678/infosysVirtual_batch3.git"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
