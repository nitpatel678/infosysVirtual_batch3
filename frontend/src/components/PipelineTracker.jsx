import React from 'react'
import {
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Scale,
  Database,
  ArrowDown,
  GitFork,
} from 'lucide-react'

export default function PipelineTracker({ currentStep, activeStepMessage }) {
  const parallelAgents = [
    {
      id: 'rel',
      name: 'Relevance Judge',
      desc: 'Query intent & direct alignment check',
      icon: FileCheck,
    },
    {
      id: 'acc',
      name: 'Accuracy Judge',
      desc: 'Factual verification against evidence',
      icon: ShieldCheck,
    },
    {
      id: 'hal',
      name: 'Hallucination Agent',
      desc: 'Claim grounding & myth detection',
      icon: AlertTriangle,
    },
    {
      id: 'comp',
      name: 'Completeness Judge',
      desc: 'Answer depth & coverage analysis',
      icon: Scale,
    },
  ]

  // Step Mapping:
  // step 1: Stage 1 active (RAG retrieval)
  // step 2: Stage 1 done, Stage 2 active (ALL 4 agents simultaneously processing!)
  // step 3: Stage 1 & 2 done, Stage 3 active (Verdict & storage saving)
  // step 4 or 6: All stages done (100%)
  const isComplete = currentStep >= 4 || currentStep >= 6

  let progressPercent = 0
  if (currentStep === 1) progressPercent = 20
  else if (currentStep === 2) progressPercent = 65
  else if (currentStep === 3) progressPercent = 90
  else if (isComplete) progressPercent = 100

  // Stage 1 (RAG Retrieval)
  const isStage1Done = currentStep > 1
  const isStage1Active = currentStep === 1

  // Stage 2 (Parallel Judges) - ALL 4 ACTIVE SIMULTANEOUSLY on step 2
  const isStage2Active = currentStep === 2
  const isStage2Done = currentStep >= 3

  // Stage 3 (Verdict & Storage)
  const isStage3Active = currentStep === 3
  const isStage3Done = isComplete

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

      {/* Spacious 3-Stage Orchestration Architecture */}
      <div className="orch-flow-container">
        {/* STAGE 1: RAG Retrieval */}
        <div className="orch-stage-box">
          <div className="orch-stage-topbar">
            <div className="stage-left-info">
              <span className="stage-step-tag">STAGE 1</span>
              <span className="stage-heading">Knowledge Retrieval</span>
            </div>
            <span className={`stage-status-text ${isStage1Done ? 'status-text-done' : isStage1Active ? 'status-text-active' : ''}`}>
              {isStage1Done ? 'Completed' : isStage1Active ? 'Searching...' : 'Pending'}
            </span>
          </div>
          <div
            className={`orch-stage-card ${
              isStage1Done ? 'card-done' : isStage1Active ? 'card-active' : 'card-pending'
            }`}
          >
            <div className="orch-card-icon-wrap">
              {isStage1Done ? (
                <CheckCircle2 size={16} className="text-green" />
              ) : isStage1Active ? (
                <Loader2 size={16} className="spin-icon text-white" />
              ) : (
                <Search size={16} />
              )}
            </div>
            <div className="orch-card-text">
              <div className="orch-card-title">RAG Benchmark Retrieval</div>
              <div className="orch-card-sub">
                Extracts semantic grounding chunks from TruthfulQA & SQuAD knowledge base
              </div>
            </div>
          </div>
        </div>

        {/* FLOW BRIDGE 1 -> 2 (DIVIDES INTO 4 PARALLEL AGENTS) */}
        <div className={`orch-flow-bridge ${isStage2Active || isStage2Done ? 'bridge-lit' : ''}`}>
          <div className="bridge-line"></div>
          <div className="bridge-pill">
            <GitFork size={13} className="fork-icon" />
            <span>Divides into 4 Parallel Agents</span>
            <ArrowDown size={12} />
          </div>
          <div className="bridge-line"></div>
        </div>

        {/* STAGE 2: Parallel Multi-Agent Evaluation (ALL 4 PROCESS TOGETHER) */}
        <div className={`orch-stage-box ${isStage2Active ? 'stage-box-active' : isStage2Done ? 'stage-box-done' : ''}`}>
          <div className="orch-stage-topbar">
            <div className="stage-left-info">
              <span className="stage-step-tag stage-tag-parallel">STAGE 2</span>
              <span className="stage-heading">Parallel Multi-Agent Evaluation</span>
            </div>
            <div className="stage-right-info">
              <span className="stage-badge-count">4 Specialist Judges</span>
              <span className={`stage-status-text ${isStage2Done ? 'status-text-done' : isStage2Active ? 'status-text-active' : ''}`}>
                {isStage2Done ? 'All 4 Evaluated' : isStage2Active ? '4 Agents Evaluating in Parallel...' : 'Pending'}
              </span>
            </div>
          </div>

          <div className="orch-parallel-grid">
            {parallelAgents.map((agent) => (
              <div
                key={agent.id}
                className={`orch-agent-card ${
                  isStage2Done
                    ? 'card-done'
                    : isStage2Active
                    ? 'card-active card-pulse'
                    : 'card-pending'
                }`}
              >
                <div className="orch-card-icon-wrap">
                  {isStage2Done ? (
                    <CheckCircle2 size={15} className="text-green" />
                  ) : isStage2Active ? (
                    <Loader2 size={15} className="spin-icon text-white" />
                  ) : (
                    <agent.icon size={15} />
                  )}
                </div>
                <div className="orch-card-text">
                  <div className="orch-card-title">{agent.name}</div>
                  <div className="orch-card-sub">{agent.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FLOW BRIDGE 2 -> 3 (CONVERGES TO STORAGE & VERDICT) */}
        <div className={`orch-flow-bridge ${isStage3Done ? 'bridge-lit' : isStage3Active ? 'bridge-active' : ''}`}>
          <div className="bridge-line"></div>
          <div className="bridge-pill">
            <span>Converges into Consensus & Database Storage</span>
            <ArrowDown size={12} />
          </div>
          <div className="bridge-line"></div>
        </div>

        {/* STAGE 3: Consensus Verdict & Persistence */}
        <div className="orch-stage-box">
          <div className="orch-stage-topbar">
            <div className="stage-left-info">
              <span className="stage-step-tag">STAGE 3</span>
              <span className="stage-heading">Storage & Verdict</span>
            </div>
            <span className={`stage-status-text ${isStage3Done ? 'status-text-done' : isStage3Active ? 'status-text-active' : ''}`}>
              {isStage3Done ? 'Persisted & Ready' : isStage3Active ? 'Saving to Database...' : 'Pending'}
            </span>
          </div>
          <div
            className={`orch-stage-card ${
              isStage3Done ? 'card-done' : isStage3Active ? 'card-active' : 'card-pending'
            }`}
          >
            <div className="orch-card-icon-wrap">
              {isStage3Done ? (
                <CheckCircle2 size={16} className="text-green" />
              ) : isStage3Active ? (
                <Loader2 size={16} className="spin-icon text-white" />
              ) : (
                <Database size={16} />
              )}
            </div>
            <div className="orch-card-text">
              <div className="orch-card-title">Verdict Synthesis & Database Storage</div>
              <div className="orch-card-sub">
                Synthesizes final verdict, writes evaluation record to database, and prepares report view
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


