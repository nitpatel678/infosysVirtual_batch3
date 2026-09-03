import React from 'react'
import { CheckCircle2, Loader2, Search, ShieldCheck, FileCheck, AlertTriangle, Scale, Database } from 'lucide-react'

export default function PipelineTracker({ currentStep, activeStepMessage }) {
  const steps = [
    {
      id: 1,
      title: 'RAG Retrieval',
      desc: 'Benchmark Knowledge Base',
      icon: Search,
    },
    {
      id: 2,
      title: 'Relevance Agent',
      desc: 'Query intent check',
      icon: FileCheck,
    },
    {
      id: 3,
      title: 'Accuracy Agent',
      desc: 'Factual verification',
      icon: ShieldCheck,
    },
    {
      id: 4,
      title: 'Hallucination Agent',
      desc: 'Fabrication detection',
      icon: AlertTriangle,
    },
    {
      id: 5,
      title: 'Completeness Agent',
      desc: 'Coverage depth',
      icon: Scale,
    },
    {
      id: 6,
      title: 'Verdict & Neon DB',
      desc: 'Final score & record saved',
      icon: Database,
    },
  ]

  const isComplete = currentStep >= 6
  const progressPercent = Math.min(100, Math.round((currentStep / 6) * 100))

  return (
    <div className="pipeline-card">
      <div className="pipeline-header">
        <div className="pipeline-title-group">
          <span className="pipeline-title">Agent Orchestration Pipeline</span>
          <span className="pipeline-percent">{progressPercent}%</span>
        </div>
        {activeStepMessage && (
          <div className="pipeline-live-badge">
            {isComplete ? (
              <CheckCircle2 size={13} className="text-white" />
            ) : (
              <Loader2 size={13} className="spin-icon" />
            )}
            <span>{activeStepMessage}</span>
          </div>
        )}
      </div>

      <div className="pipeline-progress-bar-bg">
        <div
          className="pipeline-progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="pipeline-steps pipeline-steps-6">
        {steps.map((step) => {
          const isDone = isComplete ? true : currentStep > step.id
          const isActive = !isComplete && currentStep === step.id
          const isPending = !isComplete && currentStep < step.id

          return (
            <div
              key={step.id}
              className={`pipeline-step ${isDone ? 'step-done' : ''} ${
                isActive ? 'step-active' : ''
              } ${isPending ? 'step-pending' : ''}`}
            >
              <div className="step-indicator">
                {isDone ? (
                  <CheckCircle2 size={13} className="text-white" />
                ) : isActive ? (
                  <Loader2 size={13} className="spin-icon text-white" />
                ) : (
                  <span className="step-number">{step.id}</span>
                )}
              </div>
              <div className="step-info">
                <div className="step-name">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
