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
          <h1 className="hero-heading">AI Response Validator</h1>
          <p className="hero-subheading">
            Validate answers against reference benchmark datasets using semantic retrieval.
          </p>
        </section>

        <EvaluationModule />
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
