import React from 'react'
import { Database, Cpu, Layers, Sparkles } from 'lucide-react'

export default function StatsOverview() {
  const stats = [
    {
      label: 'Benchmark Knowledge',
      value: 'TruthfulQA + SQuAD',
      desc: '817 QAs & 1,000 SQuAD contexts',
      icon: Database,
    },
    {
      label: 'Vector Store Index',
      value: '2,766 Chunks',
      desc: 'Normalized FAISS inner-product',
      icon: Layers,
    },
    {
      label: 'Semantic Embeddings',
      value: '384 Dimensions',
      desc: 'Sentence Transformers (MiniLM)',
      icon: Cpu,
    },
    {
      label: 'Generative Model',
      value: 'Gemini 3.6 Flash',
      desc: 'Integrated API endpoint',
      icon: Sparkles,
    },
  ]

  return (
    <div className="stats-grid">
      {stats.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <div key={idx} className="stat-card">
            <div className="stat-header">
              <span className="stat-label">{stat.label}</span>
              <Icon size={16} className="stat-icon" />
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-desc">{stat.desc}</div>
          </div>
        )
      })}
    </div>
  )
}
