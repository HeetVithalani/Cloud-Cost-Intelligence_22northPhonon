import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts'
import { useSampleData } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState, ErrorBanner } from '../components/Common'
import { formatCost } from '../utils/formatters'
import { COLORS } from '../utils/formatters'

const MONTH_LABELS = ['3 Months Ago', '2 Months Ago', 'Last Month']

const ROLE_COLORS = {
  Admin:       '#6366F1',
  Developer:   '#10B981',
  DevOps:      '#06B6D4',
  'Data Team': '#FFB800',
  QA:          '#FF3B5C',
}

function RoleGroupedBar({ roleCosts }) {
  // Build grouped bar data: [{ month: '3 Months Ago', Admin: 0, Developer: 0, ... }, ...]
  const data = MONTH_LABELS.map((label, idx) => {
    const entry = { month: label }
    roleCosts.forEach(r => { entry[r.role] = r.monthlyCost?.[idx] || 0 })
    return entry
  })
  const roles = roleCosts.map(r => r.role)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
          formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {roles.map((role, i) => (
          <Bar key={role} dataKey={role} fill={ROLE_COLORS[role] || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function RoleBasedCostingPage() {
  const { data: sampleData, isLoading, error } = useSampleData()
  const [selectedRole, setSelectedRole] = useState(null)

  const roleCosts = sampleData?.roleCosts || []

  const totalSpend = roleCosts.reduce((s, r) => s + (r.totalCost || 0), 0)
  const totalSavings = roleCosts.reduce((s, r) => s + (r.savingOpportunity || 0), 0)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader
        title="Role Based Costing"
        subtitle="Cloud cost breakdown attributed to each organisational role"
      />
      {error && <ErrorBanner error={error} />}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Spend (All Roles)</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{formatCost(totalSpend)}</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Roles Tracked</div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>{roleCosts.length}</div>
          <div className="kpi-sub">Org roles</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top Spending Role</div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)', fontSize: 18 }}>
            {roleCosts.sort((a, b) => b.totalCost - a.totalCost)[0]?.role || '—'}
          </div>
          <div className="kpi-sub">Highest spend</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Saving Opportunity</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>{formatCost(totalSavings)}</div>
          <div className="kpi-sub">Across all roles</div>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-header">
          <div>
            <div className="chart-title">Role vs Cost — Last 3 Months</div>
            <div className="chart-subtitle">Monthly cloud spend by organisational role</div>
          </div>
        </div>
        {roleCosts.length > 0
          ? <RoleGroupedBar roleCosts={roleCosts} />
          : <EmptyState message="No role cost data available. Tag your AWS resources with role identifiers to enable this view." />
        }
      </div>

      {/* Role Table */}
      <div className="section-title">Cost by Role</div>
      {roleCosts.length === 0
        ? <EmptyState message="No role cost data available yet" />
        : (
        <div className="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Total Spend</th>
                <th>Top Service</th>
                <th>3-Month Trend</th>
                <th>Saving Opportunity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roleCosts.map(r => {
                const color = ROLE_COLORS[r.role] || 'var(--accent)'
                const trendUp = (r.monthlyCost?.[2] || 0) >= (r.monthlyCost?.[1] || 0)
                return (
                  <tr key={r.role} onClick={() => setSelectedRole(selectedRole === r.role ? null : r.role)} style={{ cursor: 'pointer', background: selectedRole === r.role ? 'var(--bg-elevated)' : undefined }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, color }}>{r.role}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCost(r.totalCost)}</td>
                    <td>
                      <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {r.topService}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: trendUp ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 700, fontSize: 13 }}>
                        {trendUp ? '↑' : '↓'} {r.monthlyCost?.[2] != null ? formatCost(r.monthlyCost[2]) : '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{formatCost(r.savingOpportunity)}</td>
                    <td>
                      <button
                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); setSelectedRole(selectedRole === r.role ? null : r.role) }}
                      >
                        {selectedRole === r.role ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Detail Panel */}
      {selectedRole && (() => {
        const r = roleCosts.find(x => x.role === selectedRole)
        if (!r) return null
        const color = ROLE_COLORS[r.role] || 'var(--accent)'
        return (
          <div className="card no-hover" style={{ marginTop: 20, padding: 24, borderLeft: `4px solid ${color}` }}>
            <div style={{ fontWeight: 800, fontSize: 16, color, marginBottom: 16 }}>{r.role} — Detailed Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL SPEND</div><div style={{ fontWeight: 800, fontSize: 20 }}>{formatCost(r.totalCost)}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TOP SERVICE</div><div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.topService}</div></div>
              <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SAVING OPPORTUNITY</div><div style={{ fontWeight: 800, fontSize: 20, color: 'var(--accent-green)' }}>{formatCost(r.savingOpportunity)}</div></div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>3-MONTH TREND</div>
                {MONTH_LABELS.map((label, i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{formatCost(r.monthlyCost?.[i] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
