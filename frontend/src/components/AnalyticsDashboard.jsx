import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  RotateCcw,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://127.0.0.1:8000/api/analytics')
      if (!res.ok) {
        throw new Error('Failed to load analytics summary from backend.')
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message || 'Error fetching analytics data.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="analytics-loading-box">
        <div className="spinner-circle" />
        <p>Loading analytics trajectory and historical data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-card">
        <AlertTriangle size={18} />
        <span>{error}</span>
        <button type="button" className="btn-secondary" onClick={fetchAnalytics}>
          Retry
        </button>
      </div>
    )
  }

  const summary = data || {}
  const rates = summary.rates || {}
  const avgs = summary.averages || {}
  const trajectory = summary.recent_trajectory || []
  const monthly = summary.monthly_trends || []

  const chartWidth = 720
  const chartHeight = 220
  const paddingX = 40
  const paddingY = 30

  const minScore = 0.0
  const maxScore = 5.0

  const points = trajectory.map((item, index) => {
    const x =
      trajectory.length > 1
        ? paddingX + (index / (trajectory.length - 1)) * (chartWidth - paddingX * 2)
        : chartWidth / 2
    const y =
      chartHeight -
      paddingY -
      ((item.score - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
    return { x, y, ...item }
  })

  let pathD = ''
  if (points.length === 1) {
    pathD = `M ${points[0].x} ${points[0].y}`
  } else if (points.length > 1) {
    pathD = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const controlX = (current.x + next.x) / 2
      pathD += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
    }
  }

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${
          chartHeight - paddingY
        } Z`
      : ''

  const maxMonthCount = Math.max(1, ...monthly.map((m) => m.total || 0))
  const barChartWidth = 720
  const barChartHeight = 200
  const barPaddingX = 50
  const barPaddingY = 30
  const availableWidth = barChartWidth - barPaddingX * 2
  const slotWidth = monthly.length > 0 ? availableWidth / monthly.length : availableWidth
  const barWidth = Math.min(36, slotWidth * 0.5)

  return (
    <div className="analytics-page-container">
      <div className="analytics-header-row flex-between">
        <div>
          <h2 className="analytics-title">Analytics & Historical Insights</h2>
          <p className="analytics-subtitle">
            Quantitative analysis of all AI evaluations, scoring trends, hallucination frequency, and month-wise performance metrics.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary flex-gap"
          onClick={fetchAnalytics}
          title="Refresh analytics data"
        >
          <RotateCcw size={14} />
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="analytics-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Submissions</span>
          <div className="stat-val-group">
            <span className="stat-number">{summary.total || 0}</span>
            <span className="stat-sub">Evaluated Queries</span>
          </div>
        </div>

        <div className="stat-card stat-pass">
          <span className="stat-label">Pass Rate</span>
          <div className="stat-val-group">
            <span className="stat-number text-pass">{rates.pass_rate || 0}%</span>
            <span className="stat-sub">{summary.passed || 0} Passed</span>
          </div>
        </div>

        <div className="stat-card stat-needs">
          <span className="stat-label">Needs Improvement</span>
          <div className="stat-val-group">
            <span className="stat-number text-needs">{rates.needs_rate || 0}%</span>
            <span className="stat-sub">{summary.needs_improvement || 0} Flagged</span>
          </div>
        </div>

        <div className="stat-card stat-fail">
          <span className="stat-label">Fail Rate</span>
          <div className="stat-val-group">
            <span className="stat-number text-fail">{rates.fail_rate || 0}%</span>
            <span className="stat-sub">{summary.failed || 0} Failed</span>
          </div>
        </div>

        <div className="stat-card stat-hallucination">
          <span className="stat-label">Hallucination Frequency</span>
          <div className="stat-val-group">
            <span className="stat-number text-purple">{rates.hallucination_rate || 0}%</span>
            <span className="stat-sub">{summary.hallucinations || 0} Ungrounded</span>
          </div>
        </div>

        <div className="stat-card stat-conflicts">
          <span className="stat-label">Ground Truth Conflicts</span>
          <div className="stat-val-group">
            <span className="stat-number text-orange">{summary.conflicts || 0}</span>
            <span className="stat-sub">Ref vs RAG Disputed</span>
          </div>
        </div>
      </div>

      <div className="analytics-charts-2col">
        <div className="chart-card-full">
          <div className="chart-header flex-between">
            <div className="flex-align-center">
              <TrendingUp size={16} className="text-accent" />
              <h4>Overall Score Trajectory & Curve (Recent Evaluations)</h4>
            </div>
            <div className="chart-legend-group">
              <span className="legend-indicator indicator-pass">Pass Threshold (3.50)</span>
              <span className="legend-indicator indicator-needs">Needs Improvement (2.70)</span>
            </div>
          </div>

          <div className="svg-chart-wrapper">
            {points.length > 0 ? (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="analytics-svg-chart"
              >
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[1, 2, 3, 4, 5].map((level) => {
                  const y =
                    chartHeight -
                    paddingY -
                    ((level - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
                  return (
                    <g key={level}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="rgba(255, 255, 255, 0.06)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3}
                        fill="#71717a"
                        fontSize="10"
                        textAnchor="end"
                      >
                        {level}.0
                      </text>
                    </g>
                  )
                })}

                <line
                  x1={paddingX}
                  y1={
                    chartHeight -
                    paddingY -
                    ((3.5 - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
                  }
                  x2={chartWidth - paddingX}
                  y2={
                    chartHeight -
                    paddingY -
                    ((3.5 - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
                  }
                  stroke="#34d399"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />

                <line
                  x1={paddingX}
                  y1={
                    chartHeight -
                    paddingY -
                    ((2.7 - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
                  }
                  x2={chartWidth - paddingX}
                  y2={
                    chartHeight -
                    paddingY -
                    ((2.7 - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
                  }
                  stroke="#fbbf24"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />

                {areaD && <path d={areaD} fill="url(#curveGradient)" />}

                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint === idx ? 6 : 4}
                    fill={
                      pt.verdict?.toLowerCase().includes('pass')
                        ? '#34d399'
                        : pt.verdict?.toLowerCase().includes('needs')
                        ? '#fbbf24'
                        : pt.verdict?.toLowerCase().includes('unver')
                        ? '#c084fc'
                        : '#f87171'
                    }
                    stroke="#09090b"
                    strokeWidth="2"
                    className="curve-point-dot"
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </svg>
            ) : (
              <div className="chart-empty-state">No evaluation trajectory data available yet.</div>
            )}

            {hoveredPoint !== null && points[hoveredPoint] && (
              <div
                className="chart-tooltip-box"
                style={{
                  left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
                  top: `${(points[hoveredPoint].y / chartHeight) * 100}%`,
                }}
              >
                <div className="tooltip-title">Record #{points[hoveredPoint].id}</div>
                <div className="tooltip-row">
                  <span>Score:</span>
                  <strong>{points[hoveredPoint].score?.toFixed(2)} / 5.00</strong>
                </div>
                <div className="tooltip-row">
                  <span>Verdict:</span>
                  <span className={`badge-subtle ${points[hoveredPoint].verdict?.toLowerCase()}`}>
                    {points[hoveredPoint].verdict}
                  </span>
                </div>
                {points[hoveredPoint].date && (
                  <div className="tooltip-date">{points[hoveredPoint].date}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="chart-card-full">
          <div className="chart-header flex-between">
            <div className="flex-align-center">
              <Calendar size={16} className="text-accent" />
              <h4>Month-Wise Evaluation Volume & Verdict Distribution</h4>
            </div>
            <div className="chart-legend-group">
              <span className="legend-indicator indicator-pass">Pass</span>
              <span className="legend-indicator indicator-needs">Needs Improvement</span>
              <span className="legend-indicator indicator-fail">Fail</span>
            </div>
          </div>

          <div className="svg-chart-wrapper">
            {monthly.length > 0 ? (
              <svg
                viewBox={`0 0 ${barChartWidth} ${barChartHeight}`}
                className="analytics-svg-chart"
              >
                <line
                  x1={barPaddingX}
                  y1={barChartHeight - barPaddingY}
                  x2={barChartWidth - barPaddingX}
                  y2={barChartHeight - barPaddingY}
                  stroke="rgba(255, 255, 255, 0.12)"
                />

                {monthly.map((m, idx) => {
                  const slotX = barPaddingX + idx * slotWidth + slotWidth / 2
                  const barX = slotX - barWidth / 2

                  const passRatio = (m.passed || 0) / maxMonthCount
                  const needsRatio = (m.needs || 0) / maxMonthCount
                  const failRatio = (m.failed || 0) / maxMonthCount

                  const maxH = barChartHeight - barPaddingY * 2
                  const passH = passRatio * maxH
                  const needsH = needsRatio * maxH
                  const failH = failRatio * maxH

                  let currentY = barChartHeight - barPaddingY

                  const passY = currentY - passH
                  currentY = passY

                  const needsY = currentY - needsH
                  currentY = needsY

                  const failY = currentY - failH

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                      className="bar-group"
                    >
                      {passH > 0 && (
                        <rect
                          x={barX}
                          y={passY}
                          width={barWidth}
                          height={passH}
                          fill="#34d399"
                          rx="2"
                        />
                      )}
                      {needsH > 0 && (
                        <rect
                          x={barX}
                          y={needsY}
                          width={barWidth}
                          height={needsH}
                          fill="#fbbf24"
                          rx="2"
                        />
                      )}
                      {failH > 0 && (
                        <rect
                          x={barX}
                          y={failY}
                          width={barWidth}
                          height={failH}
                          fill="#f87171"
                          rx="2"
                        />
                      )}

                      <text
                        x={slotX}
                        y={barChartHeight - 10}
                        fill="#a1a1aa"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {m.month}
                      </text>

                      <text
                        x={slotX}
                        y={Math.min(failY, needsY, passY) - 6}
                        fill="#ffffff"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {m.total}
                      </text>
                    </g>
                  )
                })}
              </svg>
            ) : (
              <div className="chart-empty-state">No monthly trend data recorded yet.</div>
            )}

            {hoveredBar !== null && monthly[hoveredBar] && (
              <div
                className="chart-tooltip-box bar-tooltip"
                style={{
                  left: `${((barPaddingX + hoveredBar * slotWidth + slotWidth / 2) / barChartWidth) * 100}%`,
                  top: '20%',
                }}
              >
                <div className="tooltip-title">{monthly[hoveredBar].month} Summary</div>
                <div className="tooltip-row">
                  <span>Total Queries:</span>
                  <strong>{monthly[hoveredBar].total}</strong>
                </div>
                <div className="tooltip-row text-pass">
                  <span>Passed:</span>
                  <strong>{monthly[hoveredBar].passed || 0}</strong>
                </div>
                <div className="tooltip-row text-needs">
                  <span>Needs Imp:</span>
                  <strong>{monthly[hoveredBar].needs || 0}</strong>
                </div>
                <div className="tooltip-row text-fail">
                  <span>Failed:</span>
                  <strong>{monthly[hoveredBar].failed || 0}</strong>
                </div>
                <div className="tooltip-row">
                  <span>Avg Score:</span>
                  <strong>{monthly[hoveredBar].avg_score?.toFixed(2)} / 5.0</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dimension-performance-card">
        <div className="card-header">
          <div className="flex-align-center">
            <Layers size={16} className="text-accent" />
            <h4>Dimension Performance Breakdown</h4>
          </div>
          <span className="dimension-note">Averaged across {summary.total || 0} historical evaluations</span>
        </div>

        <div className="dimension-bars-grid">
          <div className="dimension-bar-item">
            <div className="dim-bar-header flex-between">
              <span className="dim-name">Relevance Judge</span>
              <span className="dim-score-num">{avgs.relevance?.toFixed(2) || '0.00'} / 5.0</span>
            </div>
            <div className="dim-track-bg">
              <div
                className="dim-fill-bar bar-rel"
                style={{ width: `${((avgs.relevance || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="dim-desc">Measures semantic alignment & direct response to user intent</span>
          </div>

          <div className="dimension-bar-item">
            <div className="dim-bar-header flex-between">
              <span className="dim-name">Accuracy Judge</span>
              <span className="dim-score-num">{avgs.accuracy?.toFixed(2) || '0.00'} / 5.0</span>
            </div>
            <div className="dim-track-bg">
              <div
                className="dim-fill-bar bar-acc"
                style={{ width: `${((avgs.accuracy || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="dim-desc">Validates factual correctness against TruthfulQA & SQuAD</span>
          </div>

          <div className="dimension-bar-item">
            <div className="dim-bar-header flex-between">
              <span className="dim-name">Hallucination Detection</span>
              <span className="dim-score-num">{avgs.hallucination?.toFixed(2) || '0.00'} / 5.0</span>
            </div>
            <div className="dim-track-bg">
              <div
                className="dim-fill-bar bar-hal"
                style={{ width: `${((avgs.hallucination || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="dim-desc">Cross-references claims against RAG evidence chunks</span>
          </div>

          <div className="dimension-bar-item">
            <div className="dim-bar-header flex-between">
              <span className="dim-name">Completeness Judge</span>
              <span className="dim-score-num">{avgs.completeness?.toFixed(2) || '0.00'} / 5.0</span>
            </div>
            <div className="dim-track-bg">
              <div
                className="dim-fill-bar bar-comp"
                style={{ width: `${((avgs.completeness || 0) / 5) * 100}%` }}
              />
            </div>
            <span className="dim-desc">Assesses question sub-parts, requirements, and omissions</span>
          </div>
        </div>

        <div className="composite-summary-footer flex-between">
          <div className="flex-align-center">
            <Sparkles size={16} className="text-accent" />
            <span className="footer-lead-txt">System-wide Weighted Overall Composite Average:</span>
          </div>
          <div className="composite-badge-large">
            <span className="score-big">{avgs.composite?.toFixed(2) || '0.00'}</span>
            <span className="score-max">/ 5.00</span>
          </div>
        </div>
      </div>
    </div>
  )
}
