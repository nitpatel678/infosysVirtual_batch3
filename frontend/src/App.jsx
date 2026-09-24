import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import EvaluationModule from './components/EvaluationModule'
import BatchEvaluationModule from './components/BatchEvaluationModule'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import HistoryDashboard from './components/HistoryDashboard'
import './App.css'

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
          {activeView === 'evaluate' && (
            <EvaluationModule
              selectedEvalId={selectedEvalId}
              onClearSelectedEval={handleClearSelected}
            />
          )}

          {activeView === 'batch' && <BatchEvaluationModule />}

          {activeView === 'analytics' && <AnalyticsDashboard />}

          {activeView === 'history' && (
            <HistoryDashboard
              onSelectEvaluation={handleSelectFromHistory}
              onBackToForm={() => setActiveView('evaluate')}
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
    </div>
  )
}

export default App
