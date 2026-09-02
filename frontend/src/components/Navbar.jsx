import React from 'react'
import { ShieldCheck, Database, Sparkles, Terminal } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <ShieldCheck size={22} className="brand-icon" />
          </div>
          <div>
            <div className="brand-title">AI VALIDATOR</div>
            <div className="brand-subtitle">Infosys Springboard • Batch 3 • #M-3-5</div>
          </div>
        </div>

        <div className="navbar-badges">
          <div className="status-pill">
            <span className="pulsing-dot"></span>
            <span className="status-text">FAISS Active (2,766 Chunks)</span>
          </div>

          <div className="status-pill info-pill">
            <Sparkles size={13} />
            <span>Gemini 3.6 Flash</span>
          </div>
        </div>
      </div>
    </header>
  )
}
