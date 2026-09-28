import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import EvaluationModule from './components/EvaluationModule'
import BatchEvaluationModule from './components/BatchEvaluationModule'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import HistoryDashboard from './components/HistoryDashboard'
import './App.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Render Error caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-card" style={{ margin: '40px auto', maxWidth: '720px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f87171', fontSize: '16px' }}>
            An unexpected error occurred while rendering this module
          </h3>
          <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '0 0 16px 0' }}>
            {this.state.error?.message || 'Error loading view.'}
          </p>
          <button
            type="button"
            className="btn-analytics-refresh"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ width: 'fit-content' }}
          >
            Reload View
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [activeView, setActiveView] = useState('evaluate')
  const [selectedEvalId, setSelectedEvalId] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  function handleNavigateHome() {
    setSelectedEvalId(null)
    setActiveView('evaluate')
  }

  function handleSelectFromHistory(evalId) {
    setSelectedEvalId(evalId)
    setActiveView('evaluate')
  }

  function handleInspectFromAnalytics(evalId) {
    setSelectedEvalId(evalId)
    setActiveView('history')
  }

  function handleClearSelected() {
    setSelectedEvalId(null)
  }

  const viewTitles = {
    evaluate: 'Single Evaluation',
    batch: 'Batch CSV Evaluation Module',
    analytics: 'Analytics & Insights Dashboard',
    history: 'Evaluation History & Records',
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onNavigateHome={handleNavigateHome}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="app-main-area">
        <header className="app-topbar">
          <div className="topbar-left">
            <h2 className="topbar-view-title">{viewTitles[activeView] || 'SentryAI'}</h2>
          </div>
          <div className="topbar-right">
            <span className="topbar-badge">Infosys Springboard #M-3-5</span>
          </div>
        </header>

        <main className="content-container">
          <ErrorBoundary key={activeView}>
            {activeView === 'evaluate' && (
              <EvaluationModule
                selectedEvalId={selectedEvalId}
                onClearSelectedEval={handleClearSelected}
              />
            )}

            {activeView === 'batch' && <BatchEvaluationModule />}

            {activeView === 'analytics' && (
              <AnalyticsDashboard onSelectEvaluation={handleInspectFromAnalytics} />
            )}

            {activeView === 'history' && (
              <HistoryDashboard
                initialRecordId={selectedEvalId}
                onClearInitialRecord={handleClearSelected}
                onSelectEvaluation={handleSelectFromHistory}
                onBackToForm={() => setActiveView('evaluate')}
              />
            )}
          </ErrorBoundary>
        </main>

        <footer className="footer">
          <div className="footer-container">
            <div className="footer-title">Infosys Springboard Virtual Internship</div>
            <div className="footer-details">Project #M-3-5 • Nitin Patel</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
