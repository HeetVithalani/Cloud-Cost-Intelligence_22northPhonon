import { useState } from 'react'
import { Info, Clock } from 'lucide-react'
import { useIAM, useIAMResources } from '../hooks/useQueries'
import { StatusBadge } from '../components/MetricCard'
import { DataTable } from '../components/DataTable'
import { LoadingSkeleton, ErrorBanner, PageHeader } from '../components/Common'
import { formatCost, timeAgo } from '../utils/formatters'

export default function IAMRolesPage() {
  const { data: roles, isLoading, error } = useIAM()
  const [selected, setSelected] = useState(null)
  const [detailTab, setDetailTab] = useState('resources')
  const { data: roleResources, isLoading: resLoading } = useIAMResources(selected?.roleName)
  return (
    <div className="fade-in">
      <PageHeader title="IAM Role Explorer" subtitle="Filter all AWS resources by IAM role — unique to CloudSense" />
      <div className="info-banner"><Info size={16} />AWS Console cannot filter resources across services by IAM role. CloudSense can.</div>
      <ErrorBanner error={error} />
      {isLoading ? <LoadingSkeleton rows={6} /> : (
        <div className="roles-grid">
          {(roles || []).map(role => (
            <div key={role.roleName} className={`role-card ${selected?.roleName === role.roleName ? 'selected' : ''}`} onClick={() => setSelected(role)}>
              <div className="role-name">{role.roleName}</div>
              <div className="role-services">{role.services?.map(s => <span key={s} className="pill grey">{s}</span>)}</div>
              <div className="role-meta">
                <span className="pill cyan">{role.resourceCount || 0} resources</span>
                {role.isOverPrivileged && <span className="pill red">OVER-PRIVILEGED</span>}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}><Clock size={10} /> {role.lastActivity ? timeAgo(role.lastActivity) : 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div className="card no-hover" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Role: <span style={{ color: 'var(--accent-cyan)' }}>{selected.roleName}</span></h3>
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
          {detailTab === 'activity' && <div className="info-banner"><Info size={16} />Enable AWS CloudTrail for full activity logging →</div>}
        </div>
      )}
    </div>
  )
}
