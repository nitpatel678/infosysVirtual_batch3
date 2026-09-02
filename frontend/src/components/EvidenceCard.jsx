import React from 'react'
import { motion } from 'framer-motion'
import { Database, Percent, Bookmark } from 'lucide-react'

export default function EvidenceCard({ evidence, index }) {
  const scorePercent = (evidence.score * 100).toFixed(1)
  const isHighConfidence = evidence.score >= 0.7

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="evidence-card"
    >
      <div className="evidence-card-top">
        <div className="evidence-tags">
          <span className="source-tag">
            <Database size={12} />
            {evidence.source || 'Knowledge Base'}
          </span>
          {evidence.category && (
            <span className="category-tag">
              <Bookmark size={11} />
              {evidence.category}
            </span>
          )}
        </div>

        <div className="match-gauge-wrapper">
          <div className="match-score">
            <Percent size={11} />
            <span>{scorePercent}% Similarity</span>
          </div>
        </div>
      </div>

      {evidence.question && (
        <div className="evidence-sub-field">
          <span className="sub-field-label">Benchmark Question:</span>
          <p className="sub-field-value">{evidence.question}</p>
        </div>
      )}

      {evidence.answer && (
        <div className="evidence-sub-field">
          <span className="sub-field-label">Reference Ground Truth:</span>
          <p className="sub-field-value ground-truth">{evidence.answer}</p>
        </div>
      )}

      <div className="evidence-passage">
        <span className="sub-field-label">Extracted Vector Chunk:</span>
        <p className="passage-content">{evidence.text}</p>
      </div>
    </motion.div>
  )
}
