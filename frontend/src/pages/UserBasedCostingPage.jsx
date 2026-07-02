import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Search, X } from 'lucide-react'
import { useUserCostMetrics, useUserCostDetail } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState, ErrorBanner } from '../components/Common'
import { formatCost, timeAgo } from '../utils/formatters'

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const ALL_ROLES = ['All Roles', 'Admin', 'Developer', 'DevOps', 'Data Team', 'QA', 'Viewer']

export default function UserBasedCostingPage() {
  const { data: users, isLoading, error } = useUserCostMetrics()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [selectedUser, setSelectedUser] = useState(null)
  const { data: userDetail } = useUserCostDetail(selectedUser?.userId)

  const filtered = useMemo(() => {
    let result = users || []
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    }
    if (roleFilter !== 'All Roles') result = result.filter(u => u.role === roleFilter)
    return result
  }, [users, search, roleFilter])

  // Detail data (merge from list + detail endpoint)
  const detail = selectedUser ? {
    ...selectedUser,
    ...(userDetail || {}),
    serviceBreakdown: userDetail?.serviceBreakdown?.length > 0 ? userDetail.serviceBreakdown : selectedUser.serviceBreakdown || [],
    monthlyCost: userDetail?.monthlyCost?.length > 0 ? userDetail.monthlyCost : selectedUser.monthlyCost || [],
    recommendations: userDetail?.recommendations || [
      'Review EC2 instance sizes for right-sizing',
      'Check for unused EBS volumes',
      'Consider Savings Plans for consistent workloads',
    ],
  } : null

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader title="User Based Costing" subtitle="Cost attribution per team member" />
      <ErrorBanner error={error} />

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}
        >
          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} users</span>
      </div>

      {/* Users Table */}
      {filtered.length === 0 ? (
        <EmptyState message={users?.length === 0 ? 'No user cost data available. Ensure resources are tagged with user info.' : 'No users match your filters.'} />
      ) : (
        <div className="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Total Spend</th>
                <th>Top Service</th>
                <th>Last Active</th>
                <th>Saving Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr
                  key={u.userId}
                  onClick={() => setSelectedUser(selectedUser?.userId === u.userId ? null : u)}
                  style={{ cursor: 'pointer', background: selectedUser?.userId === u.userId ? 'var(--bg-elevated)' : undefined }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="user-avatar-lg" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{u.role}</span></td>
                  <td style={{ fontFamily: 'Orbitron, monospace', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{formatCost(u.totalCost)}</td>
                  <td><span className="pill cyan">{u.topService}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.lastActive ? timeAgo(u.lastActive) : '—'}</td>
                  <td style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{formatCost(u.savingOpportunity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelectedUser(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'auto', padding: 28, boxShadow: 'var(--shadow-elevated)', border: '1px solid var(--border)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="user-avatar-lg">{(detail.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{detail.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detail.email} · {detail.role}</div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22 }}>✕</button>
            </div>

            {/* Charts grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }} className="user-detail-grid">
              {/* Pie: cost by service */}
              <div className="card no-hover" style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Cost by Service</div>
                {detail.serviceBreakdown?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={detail.serviceBreakdown} dataKey="cost" nameKey="service" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {detail.serviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCost(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState message="No service breakdown data" />}
              </div>

              {/* Line: monthly cost trend */}
              <div className="card no-hover" style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Monthly Cost Trend</div>
                {detail.monthlyCost?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={detail.monthlyCost}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={(v) => formatCost(v)} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="cost" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState message="No trend data" />}
              </div>
            </div>

            {/* Recommendations */}
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>💡 Recommendations</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {(detail.recommendations || []).map((r, i) => (
                <div key={i} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>→</span> {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
