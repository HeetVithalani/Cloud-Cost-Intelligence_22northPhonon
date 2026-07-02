import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function MetricCard({ title, value, unit, subtitle, change, changeDir, icon: Icon, accentColor = 'var(--accent-cyan)', loading }) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = React.useRef(value)
  useEffect(() => {
    if (value == null || isNaN(value)) { setDisplayValue(value || 0); return }
    const target = parseFloat(value)
    if (prevValue.current === target) { setDisplayValue(target); return }
    prevValue.current = target
    let current = 0; const steps = 40; const inc = target / steps
    const timer = setInterval(() => { current += inc; if (current >= target) { setDisplayValue(target); clearInterval(timer) } else setDisplayValue(current) }, 25)
    return () => clearInterval(timer)
  }, [value])

  if (loading) return <div className="metric-card skeleton" />
  return (
    <div className="metric-card" style={{ borderTop: `2px solid ${accentColor}` }}>
      <div className="metric-card-header">
        <span className="metric-title">{title}</span>
        {Icon && <Icon size={18} color={accentColor} />}
      </div>
      <div className="metric-value" style={{ fontFamily: 'Orbitron, monospace', color: accentColor }}>
        {unit === '$' ? '$' : ''}{typeof displayValue === 'number' ? displayValue.toFixed(unit === '$' ? 2 : 0) : displayValue}{unit && unit !== '$' ? unit : ''}
      </div>
      {change && (
        <div className={`metric-change ${changeDir === 'up' ? 'change-up' : 'change-down'}`}>
          {changeDir === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {change}
        </div>
      )}
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    running: { color: 'var(--accent-green)', label: 'Running', pulse: true },
    stopped: { color: 'var(--accent-red)', label: 'Stopped' },
    pending: { color: 'var(--accent-amber)', label: 'Pending' },
    healthy: { color: 'var(--accent-green)', label: 'Healthy', pulse: true },
    critical: { color: 'var(--accent-red)', label: 'Critical' },
    warning: { color: 'var(--accent-amber)', label: 'Warning' },
    ok: { color: 'var(--accent-green)', label: 'OK', pulse: true },
    alarm: { color: 'var(--accent-red)', label: 'ALARM' },
    insufficient_data: { color: 'var(--text-muted)', label: 'No Data' },
    available: { color: 'var(--accent-green)', label: 'Available', pulse: true },
    'in-use': { color: 'var(--accent-cyan)', label: 'In Use', pulse: true },
  }
  const c = map[status?.toLowerCase()] || { color: 'var(--text-muted)', label: status || 'Unknown' }
  return (
    <span className="status-badge" style={{ background: c.color + '22', color: c.color, border: `1px solid ${c.color}44` }}>
      <span className={`status-dot ${c.pulse ? 'pulse' : ''}`} style={{ background: c.color }} />
      {c.label}
    </span>
  )
}
