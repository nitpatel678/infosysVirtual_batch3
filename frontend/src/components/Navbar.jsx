import React from 'react'
import { Clock, PlusCircle } from 'lucide-react'

export default function Navbar({ activeView, setActiveView, onNavigateHome }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div
          className="navbar-brand clickable-brand"
          onClick={() => {
            if (onNavigateHome) {
              onNavigateHome()
            } else {
              setActiveView('evaluate')
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onNavigateHome) onNavigateHome()
              else setActiveView('evaluate')
            }
          }}
        >
          <span className="brand-title">AI Response Validator</span>
          <span className="brand-subtitle">Infosys Springboard #M-3-5</span>
        </div>

        <div className="navbar-actions">
          {activeView === 'evaluate' ? (
            <button
              type="button"
              className="nav-history-btn"
              onClick={() => setActiveView('history')}
            >
              <Clock size={14} />
              <span>Evaluation Records</span>
            </button>
          ) : (
            <button
              type="button"
              className="nav-history-btn nav-new-btn"
              onClick={() => setActiveView('evaluate')}
            >
              <PlusCircle size={14} />
              <span>New Evaluation</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
