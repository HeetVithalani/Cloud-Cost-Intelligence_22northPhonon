import { useState, useContext } from 'react'
import { Activity, Download, RefreshCw, Filter, X } from 'lucide-react'
import { AuthContext } from '../../context/AuthContext'
import { useAdminLogs } from '../../hooks/useQueries'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'

const ACTION_TYPES = ['all', 'LOGIN', 'LOGOUT', 'REGISTER', 'USER_CREATED', 'USER_DELETED', 'ROLE_CHANGED', 'USER_ACTIVATED', 'USER_DEACTIVATED']
const ACTION_COLORS = {
  LOGIN: '#10B981', LOGOUT: '#64748B', REGISTER: '#F97316',
  USER_CREATED: '#F59E0B', USER_DELETED: '#EF4444',
  ROLE_CHANGED: '#8B5CF6', USER_ACTIVATED: '#10B981', USER_DEACTIVATED: '#EF4444',
}

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || '#64748B'
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}33`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.4px' }}>
      {action}
    </span>
  )
}

export default function LogsPage() {
  const { user: me } = useContext(AuthContext)
  const navigate = useNavigate()
  const qc = useQueryClient()

  if (me && me.role !== 'Admin') { navigate('/'); return null }

  const [filters, setFilters] = useState({ user: '', action: 'all', from: '', to: '' })
  const [appliedFilters, setAppliedFilters] = useState({})
  const [exporting, setExporting] = useState(false)

  const apiFilters = Object.fromEntries(Object.entries(appliedFilters).filter(([, v]) => v && v !== 'all'))
  const { data: logs = [], isLoading, dataUpdatedAt } = useAdminLogs(apiFilters)

  const applyFilters = () => setAppliedFilters({ ...filters })
  const clearFilters = () => { setFilters({ user: '', action: 'all', from: '', to: '' }); setAppliedFilters({}) }

  const handleExport = async () => {
    setExporting(true)
    try {
      const resp = await apiClient.get('/admin/logs/export', { responseType: 'blob', params: apiFilters })
      const url = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = url; a.download = `cloudsense-logs-${new Date().toISOString().split('T')[0]}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
    finally { setExporting(false) }
  }

  const inp = { padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Activity Logs</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{logs.length} events · Last refreshed {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-logs'] })} className="btn btn-ghost"><RefreshCw size={14} /> Refresh</button>
          <button onClick={handleExport} disabled={exporting} className="btn btn-primary">
            {exporting ? <><RefreshCw size={14} className="spin" /> Exporting...</> : <><Download size={14} /> Export CSV</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card no-hover" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>User / Email</label>
            <input style={{ ...inp, width: '100%', boxSizing: 'border-box' }} type="text" placeholder="Search user..." value={filters.user} onChange={e => setFilters(f => ({...f, user: e.target.value}))} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Action Type</label>
            <select style={{ ...inp, width: '100%', boxSizing: 'border-box' }} value={filters.action} onChange={e => setFilters(f => ({...f, action: e.target.value}))}>
              {ACTION_TYPES.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>From Date</label>
            <input style={{ ...inp, width: '100%', boxSizing: 'border-box' }} type="date" value={filters.from} onChange={e => setFilters(f => ({...f, from: e.target.value}))} />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>To Date</label>
            <input style={{ ...inp, width: '100%', boxSizing: 'border-box' }} type="date" value={filters.to} onChange={e => setFilters(f => ({...f, to: e.target.value}))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyFilters} className="btn btn-primary"><Filter size={14} /> Apply</button>
            <button onClick={clearFilters} className="btn btn-ghost"><X size={14} /> Clear</button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {['User', 'Action', 'Page', 'IP Address', 'Timestamp'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><RefreshCw size={18} className="spin" style={{ display: 'inline' }} /> Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No logs found for the selected filters</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{log.email || log.userId}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.userId}</div>
                </td>
                <td style={{ padding: '10px 16px' }}><ActionBadge action={log.action} /></td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.page || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.ip || '—'}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
