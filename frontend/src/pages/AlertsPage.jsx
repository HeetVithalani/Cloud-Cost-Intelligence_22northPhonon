import { useState, useContext } from 'react'
import { Info, Trash2, CheckCheck, Bell } from 'lucide-react'
import { useAlerts } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '../components/MetricCard'
import { LoadingSpinner, EmptyState, ErrorBanner, PageHeader } from '../components/Common'
import { getStatusColor, timeAgo } from '../utils/formatters'
import apiClient from '../api/client'

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('all')
  const { data: alerts, isLoading, error } = useAlerts({ severity: severityFilter !== 'all' ? severityFilter : undefined })
  const [selected, setSelected] = useState(null)
  const qc = useQueryClient()

  // FIX: removed /api prefix — baseURL already includes /api
  const markRead = async (id) => {
    await apiClient.patch(`/alerts/${id}/read`)
    qc.invalidateQueries(['alerts'])
  }

  const markAllRead = async () => {
    await apiClient.post('/alerts/mark-all-read')
    qc.invalidateQueries(['alerts'])
  }

  const deleteAlert = async (id) => {
    await apiClient.delete(`/alerts/${id}`)
    qc.invalidateQueries(['alerts'])
    if (selected?.alertId === id) setSelected(null)
  }

  const acknowledge = async (id) => {
    await apiClient.post(`/alerts/acknowledge/${id}`)
    qc.invalidateQueries(['alerts'])
  }

  const filters = ['all', 'critical', 'warning', 'info', 'acknowledged']
  const unreadCount = (alerts || []).filter(a => a.status !== 'acknowledged' && a.status !== 'read').length

  return (
    <div className="fade-in">
      <PageHeader
        title="Alerts"
        subtitle="Monitor and manage alert notifications"
        actions={
          unreadCount > 0 && (
            <button className="btn btn-sm" onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCheck size={14} /> Mark All Read ({unreadCount})
            </button>
          )
        }
      />
      <ErrorBanner error={error} />
      <div className="split-layout split-40-60">
        <div className="split-left">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="tab-bar" style={{ marginBottom: 0 }}>
              {filters.map(f => (
                <button key={f} className={`tab-btn ${severityFilter === f ? 'active' : ''}`} onClick={() => setSeverityFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? <LoadingSpinner /> : (alerts || []).length === 0 ? (
            <EmptyState message="No alerts at this time" />
          ) : (alerts || []).map((a, i) => (
            <div key={a.alertId || i} className={`alert-item severity-${a.severity} ${selected?.alertId === a.alertId ? 'selected' : ''}`} onClick={() => setSelected(a)}>
              <div className="alert-dot" style={{ background: getStatusColor(a.severity) }} />
              <div className="alert-content" style={{ flex: 1 }}>
                <div className="alert-resource">{a.resource}</div>
                <div className="alert-message">{a.message}</div>
                <div className="alert-time">{timeAgo(a.timestamp)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {a.status !== 'acknowledged' && a.status !== 'read' && (
                  <button className="btn btn-sm" onClick={e => { e.stopPropagation(); markRead(a.alertId) }} title="Mark read">✓</button>
                )}
                <button className="btn btn-sm" onClick={e => { e.stopPropagation(); deleteAlert(a.alertId) }} title="Delete" style={{ color: 'var(--accent-red)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="split-right">
          {selected ? (
            <div>
              <h3 style={{ fontFamily: 'Space Mono', marginBottom: 8 }}>{selected.resource}</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatusBadge status={selected.severity} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(selected.timestamp)}</span>
                {selected.type && <span style={{ fontSize: 11, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)' }}>{selected.type}</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>{selected.message}</p>
              {selected.suggestedAction && (
                <div className="info-banner" style={{ marginBottom: 16 }}>
                  <Info size={14} /><span>{selected.suggestedAction}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {selected.status !== 'acknowledged' && (
                  <button className="btn btn-primary" onClick={() => acknowledge(selected.alertId)}>Acknowledge</button>
                )}
                <button className="btn" onClick={() => deleteAlert(selected.alertId)} style={{ color: 'var(--accent-red)' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ) : <EmptyState message="Click an alert to view details" />}
        </div>
      </div>
    </div>
  )
}
