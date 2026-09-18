import React from 'react'
import {
  CheckSquare,
  FileSpreadsheet,
  BarChart3,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react'

export default function Sidebar({ activeView, setActiveView, onNavigateHome }) {
  return (
    <aside className="app-sidebar">
      <div
        className="sidebar-brand clickable-brand"
        onClick={() => {
          if (onNavigateHome) onNavigateHome()
          else setActiveView('evaluate')
        }}
        role="button"
        tabIndex={0}
      >
        <div className="sidebar-logo-icon">
          <ShieldCheck size={22} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">AI Validator</span>
          <span className="sidebar-brand-sub">Infosys #M-3-5</span>
        </div>
      </div>

      <div className="sidebar-section-divider" />

      <nav className="sidebar-nav">
        <div className="sidebar-group-label">EVALUATION MODES</div>

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'evaluate' ? 'active' : ''}`}
          onClick={() => setActiveView('evaluate')}
        >
          <div className="nav-item-icon">
            <CheckSquare size={16} />
          </div>
          <span className="nav-item-label">Single Evaluation</span>
          <span className="nav-item-tag">M1/M2</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveView('batch')}
        >
          <div className="nav-item-icon">
            <FileSpreadsheet size={16} />
          </div>
          <span className="nav-item-label">Batch CSV Evaluation</span>
          <span className="nav-item-tag tag-new">M3.4</span>
        </button>

        <div className="sidebar-group-label">INSIGHTS & HISTORY</div>

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('analytics')}
        >
          <div className="nav-item-icon">
            <BarChart3 size={16} />
          </div>
          <span className="nav-item-label">Analytics Dashboard</span>
          <span className="nav-item-tag tag-graphs">Graphs</span>
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => setActiveView('history')}
        >
          <div className="nav-item-icon">
            <Clock size={16} />
          </div>
          <span className="nav-item-label">Evaluation Records</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="engine-status-box">
          <div className="status-row">
            <div className="pulse-indicator-green" />
            <span className="engine-status-text">System Online</span>
          </div>
          <div className="engine-meta-row">
            <Zap size={12} className="text-accent" />
            <span>Dual Gemini Key Engine</span>
          </div>
        </div>
        <div className="sidebar-author-text">
          <span>Virtual Internship Batch 3</span>
          <span className="author-name">Nitin Patel</span>
        </div>
      </div>
    </aside>
  )
}
