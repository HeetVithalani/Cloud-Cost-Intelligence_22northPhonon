import { useState } from 'react'
import { Info } from 'lucide-react'
import { useAlerts } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../components/MetricCard'
import { LoadingSkeleton, EmptyState, ErrorBanner, PageHeader } from '../components/Common'
import { getStatusColor, timeAgo } from '../utils/formatters'
import apiClient from '../api/client'

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('all')
  const { data: alerts, isLoading, error } = useAlerts({ severity: severityFilter !== 'all' ? severityFilter : undefined })
  const [selected, setSelected] = useState(null)
  const qc = useQueryClient()
  const acknowledge = async (id, timestamp) => { await apiClient.post(`/api/alerts/acknowledge/${id}`, { timestamp }); qc.invalidateQueries(['alerts']) }
  const filters = ['all', 'critical', 'warning', 'info', 'acknowledged']
  return (
    <div className="fade-in">
      <PageHeader title="Alerts" subtitle="Monitor and manage alert notifications" />
      <ErrorBanner error={error} />
      <div className="split-layout split-40-60">
        <div className="split-left">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="status-pills">
              {filters.map(f => <button key={f} className={`status-pill ${severityFilter === f ? 'active' : ''}`} onClick={() => setSeverityFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
            </div>
          </div>
          {isLoading ? <LoadingSkeleton /> : (alerts || []).map((a, i) => (
            <div key={a.alertId || i} className={`alert-item severity-${a.severity} ${selected === a ? 'selected' : ''}`} onClick={() => setSelected(a)}>
              <div className="alert-dot" style={{ background: getStatusColor(a.severity) }} />
              <div className="alert-content">
                <div className="alert-resource">{a.resource}</div>
                <div className="alert-message">{a.message}</div>
                <div className="alert-time">{timeAgo(a.timestamp)}</div>
              </div>
              {a.status !== 'acknowledged' && <button className="btn btn-sm" onClick={e => { e.stopPropagation(); acknowledge(a.alertId, a.timestamp) }}>ACK</button>}
            </div>
          ))}
          {!isLoading && !alerts?.length && <EmptyState message="No alerts" />}
        </div>
        <div className="split-right">
          {selected ? (
            <div>
              <h3 style={{ fontFamily: 'Space Mono', marginBottom: 8 }}>{selected.resource}</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><StatusBadge status={selected.severity} /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(selected.timestamp)}</span></div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{selected.message}</p>
              {selected.suggestedAction && <div className="info-banner"><Info size={14} />{selected.suggestedAction}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => acknowledge(selected.alertId, selected.timestamp)}>Acknowledge</button>
              </div>
            </div>
          ) : <EmptyState title="Select an alert" message="Click an alert to view details" />}
        </div>
      </div>
    </div>
  )
}
