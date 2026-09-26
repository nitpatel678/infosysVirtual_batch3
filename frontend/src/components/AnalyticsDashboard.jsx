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
  PieChart,
  Target,
  Activity,
} from 'lucide-react'

export default function AnalyticsDashboard({ onSelectEvaluation }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState(null)
  const [hoveredRadarAxis, setHoveredRadarAxis] = useState(null)

  // Filters state
  const [rangePreset, setRangePreset] = useState('all') // 'all' | '7d' | '30d' | '90d' | 'custom'
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [selectedVerdict, setSelectedVerdict] = useState('all')
  const [selectedEngine, setSelectedEngine] = useState('all')

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

  async function fetchAnalytics(
    isManualRefresh = false,
    overridePreset = null,
    overrideBatch = null,
    overrideVerdict = null,
    overrideEngine = null
  ) {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')

    const activePreset = overridePreset !== null ? overridePreset : rangePreset
    const activeBatch = overrideBatch !== null ? overrideBatch : selectedBatch
    const activeVerdict = overrideVerdict !== null ? overrideVerdict : selectedVerdict
    const activeEngine = overrideEngine !== null ? overrideEngine : selectedEngine

    const { start, end } = computeDateRange(activePreset)

    const params = new URLSearchParams()
    if (start) params.append('start_date', start)
    if (end) params.append('end_date', end)
    if (activeBatch && activeBatch !== 'all') params.append('batch_id', activeBatch)
    if (activeVerdict && activeVerdict !== 'all') params.append('verdict', activeVerdict)
    if (activeEngine && activeEngine !== 'all') params.append('engine', activeEngine)

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

  function handleBatchChange(bId) {
    setSelectedBatch(bId)
    fetchAnalytics(false, null, bId)
  }

  function handleVerdictChange(v) {
    setSelectedVerdict(v)
    fetchAnalytics(false, null, null, v)
  }

  function handleEngineChange(eng) {
    setSelectedEngine(eng)
    fetchAnalytics(false, null, null, null, eng)
  }

  function handleResetFilters() {
    setRangePreset('all')
    setCustomStart('')
    setCustomEnd('')
    setSelectedBatch('all')
    setSelectedVerdict('all')
    setSelectedEngine('all')
    fetchAnalytics(false, 'all', 'all', 'all', 'all')
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

  // Donut chart calculations
  const donutTotal = summary.total || 0
  const donutPassed = summary.passed || 0
  const donutNeeds = summary.needs_improvement || 0
  const donutFailed = summary.failed || 0
  const donutUnverified = (summary.unverified || 0) + (summary.conflicts || 0)

  const rawDonutSegments = [
    { label: 'Pass', count: donutPassed, color: '#22c55e', desc: 'Fully verified & grounded' },
    { label: 'Needs Improvement', count: donutNeeds, color: '#eab308', desc: 'Minor omissions or gaps' },
    { label: 'Fail', count: donutFailed, color: '#ef4444', desc: 'Severe hallucination / error' },
    { label: 'Unverified / Conflict', count: donutUnverified, color: '#38bdf8', desc: 'Disputed or ungrounded' },
  ]
  const donutSegments = rawDonutSegments.filter((s) => s.count > 0)

  const donutCx = 140
  const donutCy = 140
  const donutRo = 106
  const donutRi = 70

  let cumulativeAngle = -Math.PI / 2
  const donutArcs = donutSegments.map((seg, idx) => {
    const fraction = donutTotal > 0 ? seg.count / donutTotal : 0
    const startAngle = cumulativeAngle
    const endAngle =
      fraction >= 0.9999 ? startAngle + 1.9999 * Math.PI : cumulativeAngle + fraction * 2 * Math.PI
    cumulativeAngle = endAngle

    const x1 = donutCx + donutRo * Math.cos(startAngle)
    const y1 = donutCy + donutRo * Math.sin(startAngle)
    const x2 = donutCx + donutRo * Math.cos(endAngle)
    const y2 = donutCy + donutRo * Math.sin(endAngle)

    const x3 = donutCx + donutRi * Math.cos(endAngle)
    const y3 = donutCy + donutRi * Math.sin(endAngle)
    const x4 = donutCx + donutRi * Math.cos(startAngle)
    const y4 = donutCy + donutRi * Math.sin(startAngle)

    const largeArc = fraction > 0.5 ? 1 : 0
    const d = `M ${x1} ${y1} A ${donutRo} ${donutRo} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${donutRi} ${donutRi} 0 ${largeArc} 0 ${x4} ${y4} Z`
    const pct = Math.round(fraction * 100)

    return { ...seg, d, pct, idx }
  })

  // Radar chart calculations
  const radarCx = 210
  const radarCy = 155
  const radarRadius = 92

  const radarDimensions = [
    {
      key: 'relevance',
      name: 'Relevance',
      score: Number(avgs.relevance || 0),
      scoreColor: '#38bdf8',
      angle: -Math.PI / 2,
      labelX: 210,
      labelY: 26,
      textAnchor: 'middle',
    },
    {
      key: 'accuracy',
      name: 'Accuracy',
      score: Number(avgs.accuracy || 0),
      scoreColor: '#34d399',
      angle: 0,
      labelX: 322,
      labelY: 151,
      textAnchor: 'start',
    },
    {
      key: 'hallucination',
      name: 'Hallucination Res.',
      score: Number(avgs.hallucination || 0),
      scoreColor: '#a855f7',
      angle: Math.PI / 2,
      labelX: 210,
      labelY: 278,
      textAnchor: 'middle',
    },
    {
      key: 'completeness',
      name: 'Completeness',
      score: Number(avgs.completeness || 0),
      scoreColor: '#fbbf24',
      angle: Math.PI,
      labelX: 98,
      labelY: 151,
      textAnchor: 'end',
    },
  ]

  const radarPolygonPoints = radarDimensions.map((d) => {
    const r = (Math.min(5.0, Math.max(0, d.score)) / 5.0) * radarRadius
    const x = radarCx + r * Math.cos(d.angle)
    const y = radarCy + r * Math.sin(d.angle)
    return { ...d, x, y }
  })

  const radarPathD =
    radarPolygonPoints.length === 4
      ? `M ${radarPolygonPoints[0].x} ${radarPolygonPoints[0].y} L ${radarPolygonPoints[1].x} ${radarPolygonPoints[1].y} L ${radarPolygonPoints[2].x} ${radarPolygonPoints[2].y} L ${radarPolygonPoints[3].x} ${radarPolygonPoints[3].y} Z`
      : ''

  const sortedDims = [...radarDimensions].sort((a, b) => b.score - a.score)
  const strongestDim = sortedDims[0] || { name: 'Relevance', score: 0 }
  const focusDim = sortedDims[sortedDims.length - 1] || { name: 'Completeness', score: 0 }
  const balanceVariance =
    Math.max(...radarDimensions.map((d) => d.score)) -
    Math.min(...radarDimensions.map((d) => d.score))
  const balanceStatus =
    balanceVariance <= 0.6
      ? 'High Balance'
      : balanceVariance <= 1.2
      ? 'Moderate Variance'
      : 'High Asymmetry'

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
            {selectedBatch !== 'all' && ` • Batch: ${selectedBatch.slice(0, 8)}...`}
            {selectedVerdict !== 'all' && ` • Verdict: ${selectedVerdict.toUpperCase()}`}
            {selectedEngine !== 'all' && ` • Engine: ${selectedEngine.toUpperCase()}`}
          </span>
        </div>

        {/* Secondary Filter Bar: Batch, Verdict, Engine */}
        <div className="analytics-filters-secondary">
          <div className="filter-select-group">
            <span className="filter-select-label">Batch:</span>
            <select
              className="analytics-filter-select"
              value={selectedBatch}
              onChange={(e) => handleBatchChange(e.target.value)}
            >
              <option value="all">All Submissions & Batches</option>
              {(summary.available_batches || []).map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.filename} ({b.total} rows • {b.created_at})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-group">
            <span className="filter-select-label">Verdict:</span>
            <select
              className="analytics-filter-select"
              value={selectedVerdict}
              onChange={(e) => handleVerdictChange(e.target.value)}
            >
              <option value="all">All Verdicts</option>
              <option value="pass">Pass</option>
              <option value="needs">Needs Improvement</option>
              <option value="fail">Fail</option>
              <option value="unverified">Unverified / Closed-World</option>
              <option value="conflict">Ground Truth Conflict</option>
            </select>
          </div>

          <div className="filter-select-group">
            <span className="filter-select-label">AI Engine:</span>
            <select
              className="analytics-filter-select"
              value={selectedEngine}
              onChange={(e) => handleEngineChange(e.target.value)}
            >
              <option value="all">All Engines</option>
              <option value="openai">OpenAI GPT</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          {(rangePreset !== 'all' || selectedBatch !== 'all' || selectedVerdict !== 'all' || selectedEngine !== 'all') && (
            <button
              type="button"
              className="btn-filter-reset"
              onClick={handleResetFilters}
              title="Reset all active filters"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
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

          {/* Secondary Charts Grid: Dimension Balance Radar & Verdict Distribution Donut */}
          <div className="analytics-charts-grid secondary-charts-grid">
            {/* 1. Multi-Agent Quality Radar Chart */}
            <div className="analytics-graph-card radar-card">
              <div className="card-header flex-between">
                <div>
                  <div className="flex-align-center gap-2">
                    <Target size={16} className="text-accent" />
                    <h4>Multi-Agent Quality Radar</h4>
                  </div>
                  <p className="card-subtitle">
                    Cross-dimensional balance across all 4 evaluation agents vs target
                  </p>
                </div>
                <div className="chart-legend-row header-legend-pills">
                  <div className="legend-item pill-legend">
                    <span className="legend-dot dot-radar-actual" />
                    <span>System Avg</span>
                  </div>
                  <div className="legend-item pill-legend">
                    <span className="legend-line line-threshold" />
                    <span>Target (5.0)</span>
                  </div>
                </div>
              </div>

              <div className="radar-layout-body">
                <div className="radar-svg-wrapper">
                  <svg viewBox="0 0 420 310" className="radar-svg">
                    <defs>
                      <radialGradient id="radarAreaGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
                        <stop offset="60%" stopColor="#6366f1" stopOpacity="0.38" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.12" />
                      </radialGradient>
                    </defs>

                    {/* Concentric Grid Polygons */}
                    {[0.25, 0.5, 0.75, 1.0].map((level, idx) => {
                      const r = level * radarRadius
                      const p0 = `${radarCx},${radarCy - r}`
                      const p1 = `${radarCx + r},${radarCy}`
                      const p2 = `${radarCx},${radarCy + r}`
                      const p3 = `${radarCx - r},${radarCy}`
                      return (
                        <g key={idx}>
                          <polygon
                            points={`${p0} ${p1} ${p2} ${p3}`}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth={level === 1.0 ? '1.5' : '1'}
                            strokeDasharray={level === 1.0 ? '4,4' : 'none'}
                          />
                          <text
                            x={radarCx + 4}
                            y={radarCy - r + 11}
                            fill="#64748b"
                            fontSize="9.5"
                            fontWeight="600"
                          >
                            {(level * 5).toFixed(1)}
                          </text>
                        </g>
                      )
                    })}

                    {/* Radial Axes */}
                    {radarDimensions.map((axis, i) => {
                      const ax = radarCx + radarRadius * Math.cos(axis.angle)
                      const ay = radarCy + radarRadius * Math.sin(axis.angle)
                      return (
                        <line
                          key={i}
                          x1={radarCx}
                          y1={radarCy}
                          x2={ax}
                          y2={ay}
                          stroke="rgba(255, 255, 255, 0.14)"
                          strokeWidth="1.2"
                        />
                      )
                    })}

                    {/* Actual Filled Radar Polygon */}
                    {radarPathD && (
                      <path
                        d={radarPathD}
                        fill="url(#radarAreaGrad)"
                        stroke="#818cf8"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Vertex nodes & Dimension Badges */}
                    {radarPolygonPoints.map((pt, i) => {
                      const isHovered = hoveredRadarAxis === pt.key
                      return (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 7 : 5}
                            fill="#38bdf8"
                            stroke="#0f172a"
                            strokeWidth={2.5}
                            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                            onMouseEnter={() => setHoveredRadarAxis(pt.key)}
                            onMouseLeave={() => setHoveredRadarAxis(null)}
                          />
                          <text
                            x={pt.labelX}
                            y={pt.labelY}
                            fill="#f8fafc"
                            fontSize="12.5"
                            fontWeight="700"
                            textAnchor={pt.textAnchor}
                          >
                            {pt.name}
                          </text>
                          <text
                            x={pt.labelX}
                            y={pt.labelY + 16}
                            fill={isHovered ? '#38bdf8' : pt.scoreColor}
                            fontSize="11.5"
                            fontWeight="600"
                            textAnchor={pt.textAnchor}
                          >
                            {pt.score.toFixed(2)} / 5.0
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </div>

                <div className="radar-insights-panel">
                  <div className="insight-stat-box">
                    <span className="stat-label">Symmetry Status</span>
                    <strong className="stat-val text-accent">{balanceStatus}</strong>
                    <span className="stat-sub">Spread: {balanceVariance.toFixed(2)} pts</span>
                  </div>
                  <div className="insight-stat-box">
                    <span className="stat-label">Leading Dimension</span>
                    <strong className="stat-val text-pass">{strongestDim.name}</strong>
                    <span className="stat-sub">{strongestDim.score.toFixed(2)} / 5.00</span>
                  </div>
                  <div className="insight-stat-box">
                    <span className="stat-label">Growth Area</span>
                    <strong className="stat-val text-warn">{focusDim.name}</strong>
                    <span className="stat-sub">{focusDim.score.toFixed(2)} / 5.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Verdict Quality Distribution Donut Chart */}
            <div className="analytics-graph-card donut-card">
              <div className="card-header flex-between">
                <div>
                  <div className="flex-align-center gap-2">
                    <PieChart size={16} className="text-accent" />
                    <h4>Verdict Distribution & Health</h4>
                  </div>
                  <p className="card-subtitle">
                    Proportional breakdown of validated submissions
                  </p>
                </div>
                <span className="donut-badge-total">{donutTotal} Records</span>
              </div>

              <div className="donut-layout-body">
                <div className="donut-svg-wrapper">
                  {donutTotal === 0 ? (
                    <div className="no-data-hint">No evaluation data available</div>
                  ) : (
                    <svg viewBox="0 0 280 280" className="donut-svg">
                      {donutArcs.map((arc, i) => {
                        const isHovered = hoveredDonutIndex === i
                        return (
                          <path
                            key={i}
                            d={arc.d}
                            fill={arc.color}
                            opacity={hoveredDonutIndex === null || isHovered ? 1 : 0.4}
                            stroke="#0f172a"
                            strokeWidth="2.5"
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            onMouseEnter={() => setHoveredDonutIndex(i)}
                            onMouseLeave={() => setHoveredDonutIndex(null)}
                          />
                        )
                      })}

                      {/* Center Cutout Content */}
                      <text
                        x={donutCx}
                        y={donutCy - 2}
                        fill="#f8fafc"
                        fontSize="32"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {rates.pass_rate || 0}%
                      </text>
                      <text
                        x={donutCx}
                        y={donutCy + 18}
                        fill="#94a3b8"
                        fontSize="10"
                        fontWeight="700"
                        letterSpacing="1.2"
                        textAnchor="middle"
                      >
                        PASS RATE
                      </text>
                    </svg>
                  )}
                </div>

                <div className="donut-legend-panel">
                  {donutSegments.map((seg, i) => {
                    const isHovered = hoveredDonutIndex === i
                    const pct =
                      donutTotal > 0 ? Math.round((seg.count / donutTotal) * 100) : 0
                    return (
                      <div
                        key={i}
                        className={`donut-legend-row ${isHovered ? 'hovered' : ''}`}
                        onMouseEnter={() => setHoveredDonutIndex(i)}
                        onMouseLeave={() => setHoveredDonutIndex(null)}
                      >
                        <div className="donut-legend-left">
                          <span
                            className="donut-legend-dot"
                            style={{ background: seg.color }}
                          />
                          <div className="donut-legend-text">
                            <span className="donut-seg-label">{seg.label}</span>
                            <span className="donut-seg-desc">{seg.desc}</span>
                          </div>
                        </div>
                        <div className="donut-seg-numbers">
                          <span className="donut-count">{seg.count}</span>
                          <span className="donut-pct">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
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

          {/* M4.1: Dimension Score Distributions */}
          {summary.dimension_distributions && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <div>
                  <div className="dashboard-section-title">
                    <BarChart3 size={17} className="text-accent" />
                    <span>Dimension Score Distributions</span>
                  </div>
                  <p className="dashboard-section-desc">
                    Frequency distribution of responses across 4 quality tiers (Optimal, Acceptable, Warning, Critical)
                  </p>
                </div>
              </div>

              <div className="score-dist-grid">
                {[
                  { key: 'composite', name: 'Overall Composite', avg: avgs.composite },
                  { key: 'relevance', name: 'Relevance (25%)', avg: avgs.relevance },
                  { key: 'accuracy', name: 'Accuracy (30%)', avg: avgs.accuracy },
                  { key: 'hallucination', name: 'Hallucination (25%)', avg: avgs.hallucination },
                  { key: 'completeness', name: 'Completeness (20%)', avg: avgs.completeness },
                ].map((dim) => {
                  const dist = summary.dimension_distributions[dim.key] || {}
                  const totalCount = (dist.tier_4_5 || 0) + (dist.tier_3_4 || 0) + (dist.tier_2_3 || 0) + (dist.tier_1_2 || 0) || 1
                  return (
                    <div key={dim.key} className="score-dist-card">
                      <div className="score-dist-card-header">
                        <span className="score-dist-card-title">{dim.name}</span>
                        <span className="score-dist-card-avg">{dim.avg?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="dist-tiers-list">
                        <div className="dist-tier-row">
                          <div className="dist-tier-meta">
                            <span className="dist-tier-label">4.0 - 5.0 (Optimal)</span>
                            <span className="dist-tier-val">{dist.tier_4_5 || 0} ({Math.round(((dist.tier_4_5 || 0) / totalCount) * 100)}%)</span>
                          </div>
                          <div className="dist-bar-track">
                            <div className="dist-bar-fill fill-tier-optimal" style={{ width: `${((dist.tier_4_5 || 0) / totalCount) * 100}%` }} />
                          </div>
                        </div>

                        <div className="dist-tier-row">
                          <div className="dist-tier-meta">
                            <span className="dist-tier-label">3.0 - 3.9 (Acceptable)</span>
                            <span className="dist-tier-val">{dist.tier_3_4 || 0} ({Math.round(((dist.tier_3_4 || 0) / totalCount) * 100)}%)</span>
                          </div>
                          <div className="dist-bar-track">
                            <div className="dist-bar-fill fill-tier-acceptable" style={{ width: `${((dist.tier_3_4 || 0) / totalCount) * 100}%` }} />
                          </div>
                        </div>

                        <div className="dist-tier-row">
                          <div className="dist-tier-meta">
                            <span className="dist-tier-label">2.0 - 2.9 (Warning)</span>
                            <span className="dist-tier-val">{dist.tier_2_3 || 0} ({Math.round(((dist.tier_2_3 || 0) / totalCount) * 100)}%)</span>
                          </div>
                          <div className="dist-bar-track">
                            <div className="dist-bar-fill fill-tier-warning" style={{ width: `${((dist.tier_2_3 || 0) / totalCount) * 100}%` }} />
                          </div>
                        </div>

                        <div className="dist-tier-row">
                          <div className="dist-tier-meta">
                            <span className="dist-tier-label">1.0 - 1.9 (Critical)</span>
                            <span className="dist-tier-val">{dist.tier_1_2 || 0} ({Math.round(((dist.tier_1_2 || 0) / totalCount) * 100)}%)</span>
                          </div>
                          <div className="dist-bar-track">
                            <div className="dist-bar-fill fill-tier-critical" style={{ width: `${((dist.tier_1_2 || 0) / totalCount) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* M4.1: Deep-Dive Diagnostics: Hallucination & Completeness */}
          <div className="dashboard-section">
            <div className="deep-dive-grid">
              {/* Hallucination Deep Dive */}
              <div className="deep-dive-card">
                <div className="deep-dive-header">
                  <div className="deep-dive-title">
                    <ShieldAlert size={16} className="text-hal" />
                    <span>Hallucination & Grounding Diagnostics</span>
                  </div>
                  <span className="stat-badge badge-cat-fail">{rates.hallucination_rate || 0}% Ungrounded</span>
                </div>

                <div className="deep-dive-stat-chips">
                  <div className="deep-dive-chip">
                    <span className="chip-label">Flagged Responses</span>
                    <span className="chip-value text-hal">{summary.hallucinations || 0}</span>
                  </div>
                  <div className="deep-dive-chip">
                    <span className="chip-label">Total Claims Flagged</span>
                    <span className="chip-value text-accent">{summary.hallucination_breakdown?.total_flagged_claims || 0}</span>
                  </div>
                  <div className="deep-dive-chip">
                    <span className="chip-label">Average Resistance</span>
                    <span className="chip-value">{avgs.hallucination?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                <div className="deep-dive-sub-list">
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Severe Hallucination (Fabricated Claims)</span>
                    <span className="sub-item-count text-fail">{summary.hallucination_breakdown?.severity_counts?.Severe || 0}</span>
                  </div>
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Moderate Hallucination (Speculative Gaps)</span>
                    <span className="sub-item-count text-needs">{summary.hallucination_breakdown?.severity_counts?.Moderate || 0}</span>
                  </div>
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Minor Speculation / Zero Hallucination</span>
                    <span className="sub-item-count text-pass">{summary.hallucination_breakdown?.severity_counts?.['Minor / Clean'] || 0}</span>
                  </div>
                </div>
              </div>

              {/* Completeness Deep Dive */}
              <div className="deep-dive-card">
                <div className="deep-dive-header">
                  <div className="deep-dive-title">
                    <Scale size={16} className="text-accent" />
                    <span>Completeness & Requirement Coverage</span>
                  </div>
                  <span className="stat-badge badge-cat-warn">{avgs.completeness?.toFixed(2) || '0.00'} / 5.0</span>
                </div>

                <div className="deep-dive-stat-chips">
                  <div className="deep-dive-chip">
                    <span className="chip-label">Total Missing Aspects</span>
                    <span className="chip-value text-needs">{summary.completeness_breakdown?.total_missing_aspects || 0}</span>
                  </div>
                  <div className="deep-dive-chip">
                    <span className="chip-label">Fully Complete</span>
                    <span className="chip-value text-pass">{summary.completeness_breakdown?.categories?.Complete || 0}</span>
                  </div>
                  <div className="deep-dive-chip">
                    <span className="chip-label">Substantially Incomplete</span>
                    <span className="chip-value text-fail">{summary.completeness_breakdown?.categories?.['Substantially Incomplete'] || 0}</span>
                  </div>
                </div>

                <div className="deep-dive-sub-list">
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Complete Responses</span>
                    <span className="sub-item-count text-pass">{summary.completeness_breakdown?.categories?.Complete || 0}</span>
                  </div>
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Mostly Complete Responses</span>
                    <span className="sub-item-count">{summary.completeness_breakdown?.categories?.['Mostly Complete'] || 0}</span>
                  </div>
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Partially Complete Responses</span>
                    <span className="sub-item-count text-needs">{summary.completeness_breakdown?.categories?.['Partially Complete'] || 0}</span>
                  </div>
                  <div className="deep-dive-sub-item">
                    <span className="sub-item-label">Substantially Incomplete Responses</span>
                    <span className="sub-item-count text-fail">{summary.completeness_breakdown?.categories?.['Substantially Incomplete'] || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* M4.1: Frequently Occurring Evaluation Issues */}
          {summary.top_issues && summary.top_issues.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <div>
                  <div className="dashboard-section-title">
                    <AlertTriangle size={17} className="text-needs" />
                    <span>Frequently Occurring Quality Bottlenecks</span>
                  </div>
                  <p className="dashboard-section-desc">
                    Ranked recurring failure modes and areas of friction identified across evaluated responses
                  </p>
                </div>
              </div>

              <div className="top-issues-grid">
                {summary.top_issues.map((iss, idx) => (
                  <div
                    key={idx}
                    className={`top-issue-card ${
                      iss.severity === 'high'
                        ? 'issue-sev-high'
                        : iss.severity === 'medium'
                        ? 'issue-sev-medium'
                        : 'issue-sev-low'
                    }`}
                  >
                    <div className="issue-card-header">
                      <span className="issue-title">{iss.name}</span>
                      <span className="issue-count-pill">{iss.count}</span>
                    </div>
                    <span className="issue-impact-text">
                      Impacts <strong>{iss.pct}%</strong> of evaluated submissions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* M4.1: Batch Quality Trends Progression Table */}
          {summary.batch_trends && summary.batch_trends.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <div>
                  <div className="dashboard-section-title">
                    <TrendingUp size={17} className="text-accent" />
                    <span>Batch Quality Progression & Trends</span>
                  </div>
                  <p className="dashboard-section-desc">
                    Comparative evaluation performance across historical batch submissions
                  </p>
                </div>
              </div>

              <div className="batch-trends-card">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Dataset File</th>
                      <th>Evaluated At</th>
                      <th>Total Rows</th>
                      <th>Pass Rate</th>
                      <th>Avg Composite</th>
                      <th>Hallucination Rate</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.batch_trends.map((b) => (
                      <tr key={b.batch_id}>
                        <td>
                          <code>{b.batch_id.slice(0, 8)}...</code>
                        </td>
                        <td>
                          <strong>{b.filename}</strong>
                        </td>
                        <td>{b.created_at}</td>
                        <td>{b.processed || b.total}</td>
                        <td>
                          <span className={b.pass_rate >= 70 ? 'text-pass' : 'text-needs'}>
                            {b.pass_rate}%
                          </span>
                        </td>
                        <td>
                          <strong>{b.avg_score?.toFixed(2)}</strong> / 5.0
                        </td>
                        <td>
                          <span className={b.hallucination_rate > 15 ? 'text-fail' : 'text-secondary'}>
                            {b.hallucination_rate}%
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-filter-batch"
                            onClick={() => handleBatchChange(b.batch_id)}
                          >
                            Filter by Batch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* M4.1: Recent Trajectory & Drill-down Navigation Table */}
          {trajectory.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <div>
                  <div className="dashboard-section-title">
                    <Activity size={17} className="text-accent" />
                    <span>Recent Evaluation Trajectory (Drill-Down Inspection)</span>
                  </div>
                  <p className="dashboard-section-desc">
                    Click any evaluated submission to navigate directly to its detailed audit dossier
                  </p>
                </div>
              </div>

              <div className="recent-drilldown-card">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Record #</th>
                      <th>Timestamp</th>
                      <th>Composite Score</th>
                      <th>Verdict</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trajectory.slice(-15).reverse().map((item) => {
                      const vLow = (item.verdict || '').toLowerCase()
                      const isPass = vLow.includes('pass') && !vLow.includes('needs') && !vLow.includes('fail')
                      const isNeeds = vLow.includes('needs') || vLow.includes('moderate')
                      const isFail = vLow.includes('fail')
                      const vClass = isPass ? 'text-pass' : isNeeds ? 'text-needs' : isFail ? 'text-fail' : 'text-accent'

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>#{item.id}</strong>
                          </td>
                          <td>{item.date || 'Recent'}</td>
                          <td>
                            <strong>{item.score?.toFixed(2)}</strong> / 5.00
                          </td>
                          <td>
                            <span className={vClass}>{item.verdict}</span>
                          </td>
                          <td>
                            {onSelectEvaluation ? (
                              <button
                                type="button"
                                className="btn-drilldown"
                                onClick={() => onSelectEvaluation(item.id)}
                                title={`Inspect detailed audit for record #${item.id}`}
                              >
                                <span>Inspect Audit</span>
                                <span>→</span>
                              </button>
                            ) : (
                              <span className="text-tertiary">Audit Saved</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
