import React from 'react'

export default function EvidenceCard({ evidence, index }) {
  const scorePercent = (evidence.score * 100).toFixed(1)

  return (
    <div className="evidence-card">
      <div className="evidence-card-top">
        <div className="evidence-tags">
          <span className="source-tag">{evidence.source || 'Benchmark'}</span>
          {evidence.category && (
            <span className="category-tag">{evidence.category}</span>
          )}
        </div>
        <span className="match-score">{scorePercent}% Match</span>
      </div>

      {evidence.question && (
        <div className="evidence-sub-field">
          <span className="sub-field-label">Question:</span>
          <p className="sub-field-value">{evidence.question}</p>
        </div>
      )}

      {evidence.answer && (
        <div className="evidence-sub-field">
          <span className="sub-field-label">Ground Truth:</span>
          <p className="sub-field-value ground-truth">{evidence.answer}</p>
        </div>
      )}

      <div className="evidence-passage">
        <p className="passage-content">{evidence.text}</p>
      </div>
    </div>
  )
}
