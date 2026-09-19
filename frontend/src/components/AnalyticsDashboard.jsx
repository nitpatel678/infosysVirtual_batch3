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
  Filter,
} from 'lucide-react'

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  // Range filter state
  const [rangePreset, setRangePreset] = useState('all') // 'all' | '7d' | '30d' | '90d' | 'custom'
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  function computeDateRange(preset) {
    if (preset === 'all') {
      return { start: null, end: null }
    }
    const now = new Date()
    const endStr = now.toISOString().slice(0, 10)
    let pastDays = 30
    if (preset === '7d') pastDays = 7
    else if (preset === '30d') pastDays = 30
    else if (preset === '90d') pastDays = 90
    else if (preset === 'custom') {
      return { start: customStart || null, end: customEnd || null }
    }

    const past = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000)
    const startStr = past.toISOString().slice(0, 10)
    return { start: startStr, end: endStr }
  }

  async function fetchAnalytics(isManualRefresh = false, overridePreset = null) {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    const activePreset = overridePreset !== null ? overridePreset : rangePreset
    const { start, end } = computeDateRange(activePreset)

    const params = new URLSearchParams()
    if (start) params.append('start_date', start)
    if (end) params.append('end_date', end)

    const url = `http://127.0.0.1:8000/api/analytics${params.toString() ? '?' + params.toString() : ''}`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Failed to load analytics summary from backend.')
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message || 'Error fetching analytics data.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  function handlePresetChange(preset) {
    setRangePreset(preset)
    if (preset !== 'custom') {
      fetchAnalytics(false, preset)
    }
  }

  function handleApplyCustomRange(e) {
    e.preventDefault()
    fetchAnalytics(false, 'custom')
  }

  if (loading && !data) {
    return (
      <div className="analytics-loading-box">
        <div className="spinner-circle" />
        <p>Loading analytics trajectory and historical data...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="error-card">
        <AlertTriangle size={18} />
        <span>{error}</span>
        <button type="button" className="btn-analytics-refresh" onClick={() => fetchAnalytics()}>
          <RotateCcw size={14} />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  const summary = data || {}
  const rates = summary.rates || {}
  const avgs = summary.averages || {}
  const trajectory = summary.recent_trajectory || []
  const monthly = summary.monthly_trends || []

  // Trajectory chart layout
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
      {/* Header and Controls */}
      <div className="analytics-header-row flex-between">
        <div>
          <h2 className="analytics-title">Analytics & Historical Insights</h2>
          <p className="analytics-subtitle">
            Quantitative analysis of all AI evaluations, scoring trends, hallucination frequency, and performance metrics.
          </p>
        </div>
        <button
          type="button"
          className={`btn-analytics-refresh ${isRefreshing ? 'refreshing' : ''}`}
          onClick={() => fetchAnalytics(true)}
          disabled={isRefreshing}
          title="Refresh analytics data"
        >
          <RotateCcw size={14} className={isRefreshing ? 'spin-icon' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Range Filter Controls Bar */}
      <div className="analytics-range-bar">
        <div className="range-presets-group">
          <div className="range-label">
            <Filter size={14} />
            <span>Time Range:</span>
          </div>
          <button
            type="button"
            className={`range-pill ${rangePreset === 'all' ? 'active' : ''}`}
            onClick={() => handlePresetChange('all')}
          >
            All Time
          </button>
          <button
            type="button"
            className={`range-pill ${rangePreset === '7d' ? 'active' : ''}`}
            onClick={() => handlePresetChange('7d')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`range-pill ${rangePreset === '30d' ? 'active' : ''}`}
            onClick={() => handlePresetChange('30d')}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            className={`range-pill ${rangePreset === '90d' ? 'active' : ''}`}
            onClick={() => handlePresetChange('90d')}
          >
            Last 90 Days
          </button>
          <button
            type="button"
            className={`range-pill ${rangePreset === 'custom' ? 'active' : ''}`}
            onClick={() => handlePresetChange('custom')}
          >
            Custom Range
          </button>
        </div>

        {rangePreset === 'custom' && (
          <form className="custom-range-form" onSubmit={handleApplyCustomRange}>
            <div className="custom-date-field">
              <label htmlFor="start-date-input">From:</label>
              <input
                id="start-date-input"
                type="date"
                className="date-input-field"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                required
              />
            </div>
            <div className="custom-date-field">
              <label htmlFor="end-date-input">To:</label>
              <input
                id="end-date-input"
                type="date"
                className="date-input-field"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-range-apply">
              Apply Filter
            </button>
          </form>
        )}

        <div className="range-active-info">
          <span>
            Showing <strong>{summary.total || 0}</strong> records{' '}
            {rangePreset === 'all'
              ? '(All Time)'
              : rangePreset === 'custom'
              ? `(${customStart || 'Start'} to ${customEnd || 'Now'})`
              : `(${rangePreset.toUpperCase()})`}
          </span>
        </div>
      </div>

      {summary.total === 0 ? (
        <div className="empty-analytics-card">
          <Calendar size={36} className="empty-icon" />
          <h3>No Evaluations in Selected Range</h3>
          <p>No evaluation records found matching the specified time range filter. Try selecting "All Time" or widening your date range.</p>
          <button
            type="button"
            className="btn-range-apply"
            onClick={() => handlePresetChange('all')}
          >
            Reset to All Time
          </button>
        </div>
      ) : (
        <>
          {/* Top Metric Cards Grid */}
          <div className="analytics-metrics-grid">
            <div className="analytics-card metric-total">
              <div className="metric-header">
                <span className="metric-label">TOTAL SUBMISSIONS</span>
                <Calendar size={18} className="metric-icon" />
              </div>
              <div className="metric-main-val">
                <span className="big-number">{summary.total || 0}</span>
                <span className="unit-label">Evaluated Queries</span>
              </div>
              <div className="metric-sub-bar">
                <span>Weighted Composite Avg: {avgs.composite?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div className="analytics-card metric-pass">
              <div className="metric-header">
                <span className="metric-label">PASS RATE</span>
                <CheckCircle2 size={18} className="metric-icon-pass" />
              </div>
              <div className="metric-main-val">
                <span className="big-number text-pass">{rates.pass_rate || 0}%</span>
                <span className="unit-label">{summary.passed || 0} Passed</span>
              </div>
              <div className="metric-progress-bg">
                <div
                  className="metric-progress-fill fill-pass"
                  style={{ width: `${rates.pass_rate || 0}%` }}
                />
              </div>
            </div>

            <div className="analytics-card metric-needs">
              <div className="metric-header">
                <span className="metric-label">NEEDS IMPROVEMENT</span>
                <AlertTriangle size={18} className="metric-icon-needs" />
              </div>
              <div className="metric-main-val">
                <span className="big-number text-needs">{rates.needs_rate || 0}%</span>
                <span className="unit-label">{summary.needs_improvement || 0} Flagged</span>
              </div>
              <div className="metric-progress-bg">
                <div
                  className="metric-progress-fill fill-needs"
                  style={{ width: `${rates.needs_rate || 0}%` }}
                />
              </div>
            </div>

            <div className="analytics-card metric-fail">
              <div className="metric-header">
                <span className="metric-label">FAIL RATE</span>
                <XCircle size={18} className="metric-icon-fail" />
              </div>
              <div className="metric-main-val">
                <span className="big-number text-fail">{rates.fail_rate || 0}%</span>
                <span className="unit-label">{summary.failed || 0} Failed</span>
              </div>
              <div className="metric-progress-bg">
                <div
                  className="metric-progress-fill fill-fail"
                  style={{ width: `${rates.fail_rate || 0}%` }}
                />
              </div>
            </div>

            <div className="analytics-card metric-hal">
              <div className="metric-header">
                <span className="metric-label">HALLUCINATION FREQUENCY</span>
                <ShieldAlert size={18} className="metric-icon-hal" />
              </div>
              <div className="metric-main-val">
                <span className="big-number text-hal">{rates.hallucination_rate || 0}%</span>
                <span className="unit-label">{summary.hallucinations || 0} Ungrounded</span>
              </div>
              <div className="metric-progress-bg">
                <div
                  className="metric-progress-fill fill-hal"
                  style={{ width: `${rates.hallucination_rate || 0}%` }}
                />
              </div>
            </div>

            <div className="analytics-card metric-conflict">
              <div className="metric-header">
                <span className="metric-label">GROUND TRUTH CONFLICTS</span>
                <HelpCircle size={18} className="metric-icon-conflict" />
              </div>
              <div className="metric-main-val">
                <span className="big-number text-conflict">{summary.conflicts || 0}</span>
                <span className="unit-label">Ref vs RAG Disputed</span>
              </div>
              <div className="metric-sub-bar">
                <span>{summary.unverified || 0} Closed-World Unverified</span>
              </div>
            </div>
          </div>

          {/* Graphs Section */}
          <div className="analytics-charts-grid">
            {/* Curved SVG Trajectory Graph */}
            <div className="analytics-graph-card">
              <div className="card-header flex-between">
                <div>
                  <div className="flex-align-center">
                    <TrendingUp size={16} className="text-accent" />
                    <h4>Score Trajectory Curve (Timeline)</h4>
                  </div>
                  <p className="card-subtitle">
                    Historical progression of weighted composite evaluation scores across submissions
                  </p>
                </div>
                <div className="chart-legend-row">
                  <div className="legend-item">
                    <span className="legend-dot dot-curve" />
                    <span>Composite Score</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-line line-threshold" />
                    <span>Pass Benchmark (3.5)</span>
                  </div>
                </div>
              </div>

              <div className="chart-svg-container">
                {trajectory.length === 0 ? (
                  <div className="no-data-hint">No score trajectory points recorded yet.</div>
                ) : (
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="trajectory-svg"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[1, 2, 3, 4, 5].map((s) => {
                      const y =
                        chartHeight -
                        paddingY -
                        ((s - minScore) / (maxScore - minScore)) * (chartHeight - paddingY * 2)
                      return (
                        <g key={s}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="rgba(255,255,255,0.06)"
                            strokeDasharray={s === 3.5 ? '4,4' : 'none'}
                          />
                          <text
                            x={paddingX - 10}
                            y={y + 4}
                            fill="#64748b"
                            fontSize="10"
                            textAnchor="end"
                          >
                            {s}.0
                          </text>
                        </g>
                      )
                    })}

                    {/* Benchmark 3.5 reference line */}
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
                      stroke="#22c55e"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      opacity="0.6"
                    />

                    {/* Shaded area */}
                    {areaD && <path d={areaD} fill="url(#scoreAreaGrad)" />}

                    {/* Smooth bezier curve */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="url(#curveLineGrad)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Points on curve */}
                    {points.map((pt, idx) => {
                      const isHovered = hoveredPoint === idx
                      const isPass = (pt.verdict || '').toLowerCase().includes('pass')
                      const isFail = (pt.verdict || '').toLowerCase().includes('fail')
                      const dotFill = isPass ? '#22c55e' : isFail ? '#ef4444' : '#eab308'

                      return (
                        <g key={idx}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4}
                            fill={dotFill}
                            stroke="#0f172a"
                            strokeWidth={2}
                            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                            onMouseEnter={() => setHoveredPoint(idx)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {idx % Math.max(1, Math.floor(points.length / 8)) === 0 && (
                            <text
                              x={pt.x}
                              y={chartHeight - 8}
                              fill="#64748b"
                              fontSize="9"
                              textAnchor="middle"
                            >
                              {pt.date || `#${pt.id}`}
                            </text>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                )}

                {/* Floating Tooltip for Hovered Point */}
                {hoveredPoint !== null && points[hoveredPoint] && (
                  <div
                    className="chart-tooltip"
                    style={{
                      left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
                      top: `${(points[hoveredPoint].y / chartHeight) * 100}%`,
                    }}
                  >
                    <div className="tooltip-title">Run #{points[hoveredPoint].id}</div>
                    <div className="tooltip-row">
                      <span>Score:</span>
                      <strong>{points[hoveredPoint].score} / 5.0</strong>
                    </div>
                    <div className="tooltip-row">
                      <span>Verdict:</span>
                      <strong className={`badge-${(points[hoveredPoint].verdict || '').toLowerCase()}`}>
                        {points[hoveredPoint].verdict}
                      </strong>
                    </div>
                    {points[hoveredPoint].date && (
                      <div className="tooltip-row tooltip-date">
                        <span>Date:</span>
                        <span>{points[hoveredPoint].date}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Month-wise Stacked Bar Chart */}
            <div className="analytics-graph-card">
              <div className="card-header flex-between">
                <div>
                  <div className="flex-align-center">
                    <BarChart3 size={16} className="text-accent" />
                    <h4>Month-Wise Evaluation Volume & Breakdown</h4>
                  </div>
                  <p className="card-subtitle">
                    Monthly distribution of evaluated question-answer pairs and verdicts
                  </p>
                </div>
                <div className="chart-legend-row">
                  <div className="legend-item">
                    <span className="legend-color color-pass" />
                    <span>Pass</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color color-needs" />
                    <span>Needs Imp.</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color color-fail" />
                    <span>Fail</span>
                  </div>
                </div>
              </div>

              <div className="chart-svg-container">
                {monthly.length === 0 ? (
                  <div className="no-data-hint">No monthly data records yet.</div>
                ) : (
                  <svg
                    viewBox={`0 0 ${barChartWidth} ${barChartHeight}`}
                    className="monthly-bar-svg"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                      const y = barChartHeight - barPaddingY - frac * (barChartHeight - barPaddingY * 2)
                      const countVal = Math.round(frac * maxMonthCount)
                      return (
                        <g key={idx}>
                          <line
                            x1={barPaddingX}
                            y1={y}
                            x2={barChartWidth - barPaddingX}
                            y2={y}
                            stroke="rgba(255,255,255,0.06)"
                          />
                          <text
                            x={barPaddingX - 10}
                            y={y + 4}
                            fill="#64748b"
                            fontSize="10"
                            textAnchor="end"
                          >
                            {countVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* Bars */}
                    {monthly.map((m, i) => {
                      const centerX = barPaddingX + i * slotWidth + slotWidth / 2
                      const barX = centerX - barWidth / 2
                      const totalHeight =
                        ((m.total || 0) / maxMonthCount) * (barChartHeight - barPaddingY * 2)

                      const passH = ((m.passed || 0) / maxMonthCount) * (barChartHeight - barPaddingY * 2)
                      const needsH = ((m.needs || 0) / maxMonthCount) * (barChartHeight - barPaddingY * 2)
                      const failH = ((m.failed || 0) / maxMonthCount) * (barChartHeight - barPaddingY * 2)

                      const baseBottomY = barChartHeight - barPaddingY
                      const passY = baseBottomY - passH
                      const needsY = passY - needsH
                      const failY = needsY - failH

                      return (
                        <g
                          key={i}
                          className="bar-column-group"
                          onMouseEnter={() => setHoveredBar(i)}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Pass segment */}
                          {passH > 0 && (
                            <rect
                              x={barX}
                              y={passY}
                              width={barWidth}
                              height={passH}
                              fill="#22c55e"
                              rx={needsH === 0 && failH === 0 ? 3 : 0}
                            />
                          )}
                          {/* Needs Improvement segment */}
                          {needsH > 0 && (
                            <rect
                              x={barX}
                              y={needsY}
                              width={barWidth}
                              height={needsH}
                              fill="#eab308"
                              rx={failH === 0 ? 3 : 0}
                            />
                          )}
                          {/* Fail segment */}
                          {failH > 0 && (
                            <rect
                              x={barX}
                              y={failY}
                              width={barWidth}
                              height={failH}
                              fill="#ef4444"
                              rx={3}
                            />
                          )}

                          {/* Month label */}
                          <text
                            x={centerX}
                            y={barChartHeight - 8}
                            fill="#94a3b8"
                            fontSize="10"
                            textAnchor="middle"
                          >
                            {m.month}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                )}

                {/* Floating Tooltip for Hovered Month */}
                {hoveredBar !== null && monthly[hoveredBar] && (
                  <div
                    className="chart-tooltip bar-tooltip"
                    style={{
                      left: `${
                        ((barPaddingX + hoveredBar * slotWidth + slotWidth / 2) / barChartWidth) *
                        100
                      }%`,
                      top: '20%',
                    }}
                  >
                    <div className="tooltip-title">{monthly[hoveredBar].month}</div>
                    <div className="tooltip-row">
                      <span>Total:</span>
                      <strong>{monthly[hoveredBar].total}</strong>
                    </div>
                    <div className="tooltip-row text-pass">
                      <span>Passed:</span>
                      <strong>{monthly[hoveredBar].passed}</strong>
                    </div>
                    <div className="tooltip-row text-needs">
                      <span>Needs Imp.:</span>
                      <strong>{monthly[hoveredBar].needs}</strong>
                    </div>
                    <div className="tooltip-row text-fail">
                      <span>Failed:</span>
                      <strong>{monthly[hoveredBar].failed}</strong>
                    </div>
                    <div className="tooltip-row">
                      <span>Avg Score:</span>
                      <strong>{monthly[hoveredBar].avg_score} / 5.0</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dimension Performance Breakdown */}
          <div className="dimension-performance-card">
            <div className="card-header">
              <div className="flex-align-center">
                <Layers size={16} className="text-accent" />
                <h4>Dimension Performance Breakdown</h4>
              </div>
              <span className="dimension-note">Averaged across {summary.total || 0} evaluations</span>
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
        </>
      )}
    </div>
  )
}
