import React from 'react'
import { Clock, CheckSquare, FileSpreadsheet } from 'lucide-react'

export default function Navbar({ activeView, setActiveView, onNavigateHome }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div
          className="navbar-brand clickable-brand"
          onClick={() => {
            if (onNavigateHome) onNavigateHome()
            else setActiveView('evaluate')
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
          <span className="brand-title">SentryAI</span>
          <span className="brand-subtitle">Response Validation Platform</span>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            className={`nav-tab-link ${activeView === 'evaluate' ? 'nav-active' : ''}`}
            onClick={() => setActiveView('evaluate')}
          >
            <CheckSquare size={14} />
            <span>Single Evaluation Module</span>
          </button>

          <button
            type="button"
            className={`nav-tab-link ${activeView === 'batch' ? 'nav-active' : ''}`}
            onClick={() => setActiveView('batch')}
          >
            <FileSpreadsheet size={14} />
            <span>Batch Evaluation (CSV)</span>
          </button>

          <button
            type="button"
            className={`nav-tab-link ${activeView === 'history' ? 'nav-active' : ''}`}
            onClick={() => setActiveView('history')}
          >
            <Clock size={14} />
            <span>Evaluation Records</span>
          </button>
        </div>
      </div>
    </header>
  )
}
