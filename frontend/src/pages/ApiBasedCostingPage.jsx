import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Filter } from 'lucide-react'
import { useApiCostMetrics } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState, ErrorBanner } from '../components/Common'
import { formatCost } from '../utils/formatters'

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16']
const STATUS_CONFIG = {
  optimised:    { label: 'Optimised',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  needs_review: { label: 'Needs Review', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  critical:     { label: 'Critical',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

export default function ApiBasedCostingPage() {
  const { data: apis, isLoading, error, refetch } = useApiCostMetrics()
  const [serviceFilter, setServiceFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const allServices = useMemo(() => ['All', ...new Set((apis || []).map(a => a.service))], [apis])
  const allStatuses = ['All', 'optimised', 'needs_review', 'critical']

  const filtered = useMemo(() => {
    let result = apis || []
    if (serviceFilter !== 'All') result = result.filter(a => a.service === serviceFilter)
    if (statusFilter !== 'All') result = result.filter(a => a.status === statusFilter)
    return result
  }, [apis, serviceFilter, statusFilter])

  // KPIs
  const totalCalls = useMemo(() => (apis || []).reduce((s, a) => s + (a.totalCalls || 0), 0), [apis])
  const totalCost = useMemo(() => (apis || []).reduce((s, a) => s + (a.totalCost || 0), 0), [apis])
  const mostExpensive = useMemo(() => (apis || []).sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))[0], [apis])
  const criticalCount = useMemo(() => (apis || []).filter(a => a.status === 'critical').length, [apis])
  const potentialSavings = useMemo(() => (apis || []).filter(a => a.status !== 'optimised').reduce((s, a) => s + (a.totalCost || 0) * 0.2, 0), [apis])

  // Top 10 chart
  const chartData = useMemo(() => {
    return [...(apis || [])].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0)).slice(0, 10).map(a => ({
      name: a.endpoint?.length > 25 ? a.endpoint.slice(0, 25) + '…' : a.endpoint,
      cost: a.totalCost || 0,
    }))
  }, [apis])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader title="API Based Costing" subtitle="Cost analysis for API endpoints and service calls" />
      <ErrorBanner error={error} onRetry={refetch} />

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL API CALLS</div>
          <div className="kpi-value" style={{ color: 'var(--accent)', fontFamily: 'Orbitron, monospace' }}>{totalCalls.toLocaleString()}</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL API COST</div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)', fontFamily: 'Orbitron, monospace' }}>{formatCost(totalCost)}</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">MOST EXPENSIVE</div>
          <div className="kpi-value" style={{ color: '#F59E0B', fontSize: 13, fontWeight: 700 }}>{mostExpensive?.endpoint?.slice(0, 25) || '—'}</div>
          <div className="kpi-sub">{mostExpensive ? formatCost(mostExpensive.totalCost) : '$0'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">POTENTIAL SAVINGS</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)', fontFamily: 'Orbitron, monospace' }}>{formatCost(potentialSavings)}</div>
          <div className="kpi-sub">{criticalCount} critical endpoints</div>
        </div>
      </div>

      {/* Top 10 Bar Chart */}
      {chartData.length > 0 && (
        <div className="card no-hover" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Top 10 Most Expensive Endpoints</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Cost per endpoint this month</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={120} />
              <Tooltip formatter={(v) => formatCost(v)} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} color="var(--text-muted)" />
        <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}>
          {allServices.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {allStatuses.map(s => {
            const sc = STATUS_CONFIG[s]
            return (
              <button key={s} className={`tab-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === 'All' ? 'All' : sc?.label || s}
              </button>
            )
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} endpoints</span>
      </div>

      {/* API Table */}
      {filtered.length === 0 ? (
        <EmptyState message="No API cost data available for the selected filters." />
      ) : (
        <div className="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Service</th>
                <th>Total Calls</th>
                <th>Avg Response (ms)</th>
                <th>Cost Per Call</th>
                <th>Total Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((api, i) => {
                const sc = STATUS_CONFIG[api.status] || STATUS_CONFIG.optimised
                return (
                  <tr key={api.endpoint || i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={api.endpoint}>
                      {api.endpoint}
                    </td>
                    <td><span className="pill cyan">{api.service}</span></td>
                    <td style={{ fontWeight: 600 }}>{(api.totalCalls || 0).toLocaleString()}</td>
                    <td>
                      <span style={{ color: api.avgResponseTime > 800 ? '#EF4444' : api.avgResponseTime > 400 ? '#F59E0B' : 'var(--text-primary)', fontWeight: 600 }}>
                        {api.avgResponseTime || 0}ms
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{api.costPerCall ? `$${api.costPerCall.toFixed(6)}` : '$0'}</td>
                    <td style={{ fontFamily: 'Orbitron, monospace', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{formatCost(api.totalCost)}</td>
                    <td>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color }} />
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
