import React from 'react'
import {
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  Clock,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

export default function Sidebar({
  activeView,
  setActiveView,
  onNavigateHome,
  collapsed = false,
  onToggleCollapse,
}) {
  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand-wrapper">
        <div
          className="sidebar-brand clickable-brand"
          onClick={() => {
            if (onNavigateHome) onNavigateHome()
            else setActiveView('evaluate')
          }}
          role="button"
          tabIndex={0}
          title="RAG AI Validator Home"
        >
          <div className="sidebar-logo-icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                fill="url(#core-grad-1)"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="url(#core-grad-2)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="url(#core-grad-2)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="7" r="1.5" fill="#ffffff" />
              <defs>
                <linearGradient
                  id="core-grad-1"
                  x1="2"
                  y1="2"
                  x2="22"
                  y2="12"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient
                  id="core-grad-2"
                  x1="2"
                  y1="12"
                  x2="22"
                  y2="22"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">AI Validator</span>
              <span className="sidebar-brand-sub">Infosys Springboard</span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      <div className="sidebar-section-divider" />

      <nav className="sidebar-nav">
        {!collapsed && <div className="sidebar-group-label">EVALUATION MODES</div>}

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'evaluate' ? 'active' : ''}`}
          onClick={() => setActiveView('evaluate')}
          title="Single Evaluation"
        >
          <div className="nav-item-icon">
            <Sparkles size={16} />
          </div>
          {!collapsed && <span className="nav-item-label">Single Evaluation</span>}
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveView('batch')}
          title="Batch CSV Evaluation"
        >
          <div className="nav-item-icon">
            <FileSpreadsheet size={16} />
          </div>
          {!collapsed && <span className="nav-item-label">Batch CSV Evaluation</span>}
        </button>

        {!collapsed && <div className="sidebar-group-label">INSIGHTS & HISTORY</div>}

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('analytics')}
          title="Analytics Dashboard"
        >
          <div className="nav-item-icon">
            <BarChart3 size={16} />
          </div>
          {!collapsed && <span className="nav-item-label">Analytics Dashboard</span>}
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => setActiveView('history')}
          title="Evaluation Records"
        >
          <div className="nav-item-icon">
            <Clock size={16} />
          </div>
          {!collapsed && <span className="nav-item-label">Evaluation Records</span>}
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="engine-status-box">
          <div className="status-row">
            <div className="pulse-indicator-green" />
            {!collapsed && <span className="engine-status-text">System Online</span>}
          </div>
          {!collapsed && (
            <div className="engine-meta-row">
              <Zap size={12} className="text-accent" />
              <span>Dual Gemini Key Engine</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="sidebar-author-text">
            <span>Virtual Internship Batch 3</span>
            <span className="author-name">Nitin Patel</span>
          </div>
        )}
      </div>
    </aside>
  )
}
