import { useState } from 'react'
import { Shield, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useIAM, useIAMResources } from '../hooks/useQueries'
import { StatusBadge } from '../components/MetricCard'
import { DataTable } from '../components/DataTable'
import { LoadingSpinner, EmptyState, ErrorBanner, PageHeader } from '../components/Common'
import { formatCost, timeAgo } from '../utils/formatters'

const STATUS_COLORS = {
  active:   { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'Active' },
  stale:    { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Stale' },
  inactive: { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', label: 'Inactive' },
}

export default function IAMRolesPage() {
  const { data: roles, isLoading, error } = useIAM()
  const [selected, setSelected] = useState(null)
  const [detailTab, setDetailTab] = useState('resources')
  const { data: roleResources, isLoading: resLoading } = useIAMResources(selected?.roleName)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader title="IAM Role Explorer" subtitle="View all IAM roles with attached policies, trust relationships, and activity status" />
      <ErrorBanner error={error} />

      {/* KPI Summary */}
      {roles?.length > 0 && (
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card">
            <div className="kpi-label">Total Roles</div>
            <div className="kpi-value" style={{ color: 'var(--accent)' }}>{roles.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active (30d)</div>
            <div className="kpi-value" style={{ color: '#10B981' }}>{roles.filter(r => r.status === 'active').length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Stale (30-90d)</div>
            <div className="kpi-value" style={{ color: '#F59E0B' }}>{roles.filter(r => r.status === 'stale').length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Over-Privileged</div>
            <div className="kpi-value" style={{ color: '#EF4444' }}>{roles.filter(r => r.isOverPrivileged).length}</div>
          </div>
        </div>
      )}

      {/* Roles Table */}
      {!roles?.length ? (
        <EmptyState message="No IAM roles found. Ensure your AWS credentials have iam:ListRoles permission." />
      ) : (
        <div className="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Role ARN</th>
                <th>Attached Policies</th>
                <th>Trust Relationship</th>
                <th>Last Used</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => {
                const sc = STATUS_COLORS[role.status] || STATUS_COLORS.inactive
                const isSelected = selected?.roleName === role.roleName
                return (
                  <tr
                    key={role.roleName}
                    onClick={() => setSelected(isSelected ? null : role)}
                    style={{ cursor: 'pointer', background: isSelected ? 'var(--bg-elevated)' : undefined }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={14} color="var(--accent-cyan)" />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{role.roleName}</div>
                          {role.isOverPrivileged && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <AlertTriangle size={10} color="#EF4444" />
                              <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>OVER-PRIVILEGED</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={role.arn}>
                      {role.arn}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(role.policies || []).slice(0, 3).map(p => (
                          <span key={p.policyName} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }} title={p.policyName}>
                            {p.policyName}
                          </span>
                        ))}
                        {(role.policyCount || 0) > 3 && (
                          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>+{role.policyCount - 3}</span>
                        )}
                        {(role.policyCount || 0) === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>None</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(role.trustRelationship || []).slice(0, 2).map((t, i) => (
                          <span key={i} style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                            {t.length > 30 ? t.slice(0, 30) + '…' : t}
                          </span>
                        ))}
                        {(role.trustRelationship?.length || 0) > 2 && (
                          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>+{role.trustRelationship.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                        <Clock size={11} />
                        {role.lastActivity ? timeAgo(role.lastActivity) : 'Never'}
                      </div>
                      {role.lastUsedRegion && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{role.lastUsedRegion}</div>}
                    </td>
                    <td>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
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

      {/* Detail Panel */}
      {selected && (
        <div className="card no-hover" style={{ marginTop: 24, borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Role: <span style={{ color: 'var(--accent-cyan)' }}>{selected.roleName}</span></h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          {/* Role details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ARN</div><div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{selected.arn}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CREATED</div><div style={{ fontSize: 12 }}>{selected.createDate ? new Date(selected.createDate).toLocaleDateString() : '—'}</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>POLICIES</div><div style={{ fontSize: 12 }}>{selected.policyCount || 0} attached</div></div>
            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TRUST ENTITIES</div><div style={{ fontSize: 12 }}>{selected.trustRelationship?.length || 0} principals</div></div>
          </div>

          {/* Attached policies list */}
          {selected.policies?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Attached Policies</div>
              {selected.policies.map(p => (
                <div key={p.policyName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{p.policyName}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>{p.type}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="tab-bar">
            <button className={`tab-btn ${detailTab === 'resources' ? 'active' : ''}`} onClick={() => setDetailTab('resources')}>Resources</button>
            <button className={`tab-btn ${detailTab === 'activity' ? 'active' : ''}`} onClick={() => setDetailTab('activity')}>Activity</button>
          </div>
          {detailTab === 'resources' && (
            <DataTable
              columns={[
                { key: 'name', label: 'Resource', render: r => <span className="mono">{r.name}</span> },
                { key: 'serviceType', label: 'Service', render: r => <span className="pill cyan">{r.serviceType}</span> },
                { key: 'region', label: 'Region' },
                { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
                { key: 'costPerMonth', label: 'Cost/mo', render: r => <span style={{ color: 'var(--accent-green)' }}>{formatCost(r.costPerMonth)}</span> },
              ]}
              data={roleResources || []} loading={resLoading} emptyMessage="No resources found using this role"
            />
          )}
          {detailTab === 'activity' && (
            <div className="info-banner" style={{ marginTop: 12 }}>
              <span>Enable AWS CloudTrail for full activity logging. Last activity: {selected.lastActivity ? timeAgo(selected.lastActivity) : 'Never'}{selected.lastUsedRegion ? ` in ${selected.lastUsedRegion}` : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
