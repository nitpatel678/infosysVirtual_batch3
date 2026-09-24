import React from 'react'
import {
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
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
          title="SentryAI Home"
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
                d="M12 2L4 5.5V11.5C4 16.5 7.4 20.9 12 22C16.6 20.9 20 16.5 20 11.5V5.5L12 2Z"
                fill="#0f172a"
                stroke="url(#sentry-sb-grad)"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="11.5" r="3.5" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="12" cy="11.5" r="1.5" fill="#38bdf8" />
              <defs>
                <linearGradient
                  id="sentry-sb-grad"
                  x1="4"
                  y1="2"
                  x2="20"
                  y2="22"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#38bdf8" />
                  <stop offset="0.5" stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">SentryAI</span>
              <span className="sidebar-brand-sub">Validation Platform</span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar (>)' : 'Collapse sidebar (<)'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
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
              <span>GPT-4o Mini & Gemini Engine</span>
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
