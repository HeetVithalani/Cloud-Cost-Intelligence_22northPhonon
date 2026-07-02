import { useRef } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { Download } from 'lucide-react'
import { formatCost, COLORS } from '../utils/formatters'

// ── Tooltip ────────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-value" style={{ color: p.color }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p.value}{suffix}
        </div>
      ))}
    </div>
  )
}

// ── Export wrapper ─────────────────────────────────────────────
export function ExportableChart({ title, subtitle, children }) {
  const ref = useRef(null)

  const handleExport = async () => {
    if (!ref.current) return
    try {
      // Dynamic import to avoid bundling html2canvas unless used
      const html2canvas = (await import('https://esm.sh/html2canvas@1.4.1')).default
      const canvas = await html2canvas(ref.current, { backgroundColor: '#1E293B', scale: 2 })
      const link = document.createElement('a')
      link.download = `${title?.replace(/\s+/g, '-').toLowerCase() || 'chart'}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // Fallback: open chart in new tab
      alert('Export requires internet connection to load html2canvas. Right-click chart to save image.')
    }
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          {title && <div className="chart-title">{title}</div>}
          {subtitle && <div className="chart-subtitle">{subtitle}</div>}
        </div>
        <button className="export-chart-btn" onClick={handleExport} title="Export as PNG">
          <Download size={12} /> PNG
        </button>
      </div>
      <div ref={ref}>
        {children}
      </div>
    </div>
  )
}

// ── 1. Area / Line Chart — Cost Trend ─────────────────────────
export function CostAreaChart({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip prefix="$" />} />
        <Area type="monotone" dataKey="cost" stroke="#F97316" fill="url(#costGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#F97316', strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── 2. Monthly Line Chart (multi-series) ──────────────────────
export function MonthlyLineChart({ data = [], height = 260 }) {
  const services = data.length > 0 && data[0].services ? Object.keys(data[0].services) : []
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data.map(d => ({ month: d.date, ...d.services }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip prefix="$" />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {services.map((svc, i) => (
          <Line key={svc} type="monotone" dataKey={svc} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── 3. Pie / Donut Chart — Cost by Service ────────────────────
export function ServiceDonutChart({ data = [], height = 280 }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="48%"
          innerRadius={65} outerRadius={95}
          dataKey="value"
          stroke="none"
          paddingAngle={2}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<CustomTooltip prefix="$" />} />
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" style={{ fontSize: 10, fontFamily: 'Inter' }}>TOTAL</text>
        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Space Grotesk' }}>
          ${(total / 1000).toFixed(1)}k
        </text>
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── 4. Bar Chart — Resource Utilisation ──────────────────────
export function ResourceUtilBarChart({ data = [], height = 260 }) {
  const getColor = (util) => util >= 70 ? '#10B981' : util >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="service" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={<CustomTooltip suffix="%" />} />
        <Bar dataKey="utilisation" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={getColor(d.utilisation)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 5. Horizontal Bar — Top 5 Expensive Services ─────────────
export function TopServicesBar({ data = [], height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={120} />
        <Tooltip content={<CustomTooltip prefix="$" />} />
        <Bar dataKey="monthly" fill="#F97316" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Sparkline ─────────────────────────────────────────────────
export function SparkLine({ data = [], color = '#F97316', width = 80, height = 30 }) {
  return (
    <div className="sparkline-container">
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
