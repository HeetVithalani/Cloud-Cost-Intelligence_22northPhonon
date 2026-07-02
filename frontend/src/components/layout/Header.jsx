import { useContext, useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, CheckCheck } from 'lucide-react'
import { AppContext } from '../../context/AppContext'
import { AuthContext } from '../../context/AuthContext'
import { useAlerts } from '../../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import { REGIONS } from '../../utils/formatters'
import { getStatusColor, timeAgo } from '../../utils/formatters'
import apiClient from '../../api/client'

const PAGE_TITLES = {
  '/': 'Overview',
  '/resources': 'Resources',
  '/iam': 'IAM Roles',
  '/cost': 'Cost & FinOps',
  '/cloudwatch': 'CloudWatch',
  '/advisor': 'Trusted Advisor',
  '/alerts': 'Alerts',
  '/reports': 'Reports',
  '/infrastructure': 'Infrastructure Analysis',
  '/savings': 'Savings Recommendations',
  '/role-costing': 'Role Based Costing',
  '/user-costing': 'User Based Costing',
  '/api-costing': 'API Based Costing',
  '/admin/users': 'User Management',
  '/admin/logs': 'Activity Logs',
}

export function Header() {
  const { region, setRegion, alertCount, sidebarCollapsed } = useContext(AppContext)
  const { user, logout } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  // Fetch recent alerts for dropdown
  const { data: recentAlerts } = useAlerts({})

  const unreadAlerts = (recentAlerts || []).filter(a => a.status !== 'acknowledged' && a.status !== 'read')
  const displayAlerts = (recentAlerts || []).slice(0, 8)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    try {
      await apiClient.post('/alerts/mark-all-read')
      qc.invalidateQueries(['alerts'])
    } catch {}
  }

  const title = PAGE_TITLES[location.pathname] || 'CostForge'
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <header className={`header ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <span className="page-title">{title}</span>

      <div className="header-actions">
        <select className="region-select" value={region} onChange={e => setRegion(e.target.value)}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Bell with dropdown */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <div className="header-bell" onClick={() => setBellOpen(!bellOpen)} title="Alerts">
            <Bell size={17} />
            {unreadAlerts.length > 0 && <span className="bell-badge">{unreadAlerts.length}</span>}
          </div>

          {bellOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, maxHeight: 440,
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: 'var(--shadow-elevated)', zIndex: 200, overflow: 'hidden',
            }}>
              {/* Dropdown header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                {unreadAlerts.length > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>

              {/* Alert list */}
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {displayAlerts.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No alerts at this time
                  </div>
                ) : displayAlerts.map((a, i) => {
                  const isUnread = a.status !== 'acknowledged' && a.status !== 'read'
                  return (
                    <div
                      key={a.alertId || i}
                      onClick={() => { setBellOpen(false); navigate('/alerts') }}
                      style={{
                        padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        background: isUnread ? 'rgba(99,102,241,0.04)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(99,102,241,0.04)' : 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(a.severity), marginTop: 5, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isUnread ? 700 : 500, fontSize: 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.resource}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(a.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div
                onClick={() => { setBellOpen(false); navigate('/alerts') }}
                style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}
              >
                View all alerts →
              </div>
            </div>
          )}
        </div>

        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <span className="user-name">{user?.name || user?.email || 'User'}</span>
          <span className={`role-badge ${user?.role?.toLowerCase() || 'viewer'}`}>{user?.role || 'Viewer'}</span>
          <span className="logout-btn" onClick={logout} title="Sign out"><LogOut size={13} /></span>
        </div>
      </div>
    </header>
  )
}
