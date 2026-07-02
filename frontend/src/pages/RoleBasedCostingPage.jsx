import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts'
import { useRoleCosts, useRoleCostDetail } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState, ErrorBanner } from '../components/Common'
import { formatCost } from '../utils/formatters'

const COLORS = ['#F97316', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

export default function RoleBasedCostingPage() {
  const { data: roles, isLoading, error, refetch } = useRoleCosts()
  const [selectedRole, setSelectedRole] = useState(null)
  const { data: roleDetail } = useRoleCostDetail(selectedRole)

  // KPIs
  const totalSpend = useMemo(() => (roles || []).reduce((s, r) => s + (r.totalCost || 0), 0), [roles])
  const topRole = useMemo(() => (roles || []).sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))[0], [roles])
  const topSavingRole = useMemo(() => (roles || []).sort((a, b) => (b.savingOpportunity || 0) - (a.savingOpportunity || 0))[0], [roles])
  const totalSaving = useMemo(() => (roles || []).reduce((s, r) => s + (r.savingOpportunity || 0), 0), [roles])

  // Chart data: role vs monthly cost (last 6 months)
  const chartData = useMemo(() => {
    if (!roles?.length) return []
    return MONTHS.map((month, mi) => {
      const entry = { month }
      for (const role of roles) {
        entry[role.role] = role.monthlyCost?.[mi]?.cost || 0
      }
      return entry
    })
  }, [roles])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader title="Role Based Costing" subtitle="Cloud cost breakdown attributed to each organisational role" />
      <ErrorBanner error={error} onRetry={refetch} />

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL SPEND (ALL ROLES)</div>
          <div className="kpi-value" style={{ color: 'var(--accent)', fontFamily: 'Orbitron, monospace' }}>{formatCost(totalSpend)}</div>
          <div className="kpi-sub">This month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">ROLES TRACKED</div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>{(roles || []).length}</div>
          <div className="kpi-sub">Org roles</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">TOP SPENDING ROLE</div>
          <div className="kpi-value" style={{ color: '#F59E0B', fontSize: 16 }}>{topRole?.role || '—'}</div>
          <div className="kpi-sub">Highest spend</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL SAVING OPPORTUNITY</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)', fontFamily: 'Orbitron, monospace' }}>{formatCost(totalSaving)}</div>
          <div className="kpi-sub">{topSavingRole?.role || '—'} has most</div>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      {chartData.length > 0 && (
        <div className="card no-hover" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Role vs Cost — Last 6 Months</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Monthly cloud spend by organisational role</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`$${value.toFixed(2)}`, undefined]}
              />
              <Legend />
              {(roles || []).map((role, i) => (
                <Bar key={role.role} dataKey={role.role} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Roles Table */}
      {!roles?.length ? (
        <EmptyState message="No role cost data available. Ensure resources are tagged with 'iamrole' in AWS." />
      ) : (
        <div className="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Total Spend</th>
                <th>Top Service</th>
                <th>Users in Role</th>
                <th>Saving Opportunity</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, i) => (
                <tr
                  key={role.role}
                  onClick={() => setSelectedRole(selectedRole === role.role ? null : role.role)}
                  style={{ cursor: 'pointer', background: selectedRole === role.role ? 'var(--bg-elevated)' : undefined }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{role.role}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'Orbitron, monospace', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>{formatCost(role.totalCost)}</td>
                  <td><span className="pill cyan">{role.topService}</span></td>
                  <td style={{ fontWeight: 600 }}>{role.usersInRole}</td>
                  <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{formatCost(role.savingOpportunity)}</td>
                  <td>
                    <span style={{ color: role.trend === 'up' ? '#EF4444' : role.trend === 'down' ? '#10B981' : 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>
                      {role.trend === 'up' ? '↑ Rising' : role.trend === 'down' ? '↓ Falling' : '— Flat'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Detail Panel */}
      {selectedRole && roleDetail && (
        <div className="card no-hover" style={{ marginTop: 24, borderLeft: '4px solid var(--accent-cyan)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Role: <span style={{ color: 'var(--accent-cyan)' }}>{selectedRole}</span></h3>
            <button onClick={() => setSelectedRole(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Users in this role ({roleDetail.users?.length || 0})</div>
          {roleDetail.users?.length > 0 ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {roleDetail.users.map(u => (
                <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{u.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No users found with this role.</div>
          )}
        </div>
      )}
    </div>
  )
}
