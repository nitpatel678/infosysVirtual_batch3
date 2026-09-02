import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Sparkles, Search, FileText } from 'lucide-react'

export default function PipelineTracker({ currentStep, activeStepMessage }) {
  const steps = [
    {
      id: 1,
      title: 'Prompt Submission',
      desc: 'Query analysis & payload prep',
      icon: FileText,
    },
    {
      id: 2,
      title: 'Gemini Generation',
      desc: 'Automated AI response',
      icon: Sparkles,
    },
    {
      id: 3,
      title: 'FAISS Vector Search',
      desc: '384-d semantic cosine search',
      icon: Search,
    },
    {
      id: 4,
      title: 'RAG Grounding Extracted',
      desc: 'TruthfulQA & SQuAD evidence',
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="pipeline-card">
      <div className="pipeline-header">
        <div className="pipeline-title">RAG EXECUTION PIPELINE</div>
        {activeStepMessage && (
          <div className="pipeline-live-badge">
            <Loader2 size={12} className="spin-icon" />
            <span>{activeStepMessage}</span>
          </div>
        )}
      </div>

      <div className="pipeline-steps">
        {steps.map((step) => {
          const isDone = currentStep > step.id
          const isActive = currentStep === step.id
          const isPending = currentStep < step.id
          const Icon = step.icon

          return (
            <div
              key={step.id}
              className={`pipeline-step ${isDone ? 'step-done' : ''} ${
                isActive ? 'step-active' : ''
              } ${isPending ? 'step-pending' : ''}`}
            >
              <div className="step-indicator">
                {isDone ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : isActive ? (
                  <Loader2 size={16} className="spin-icon text-white" />
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
