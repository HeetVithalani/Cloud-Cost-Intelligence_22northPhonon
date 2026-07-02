import { useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, RefreshCw, LogOut } from 'lucide-react'
import { AppContext } from '../../context/AppContext'
import { AuthContext } from '../../context/AuthContext'
import { REGIONS } from '../../utils/formatters'

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

  const title = PAGE_TITLES[location.pathname] || 'CloudSense'
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <header className={`header ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <span className="page-title">{title}</span>

      <div className="header-actions">
        <select className="region-select" value={region} onChange={e => setRegion(e.target.value)}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="header-bell" onClick={() => navigate('/alerts')} title="Alerts">
          <Bell size={17} />
          {alertCount > 0 && <span className="bell-badge">{alertCount}</span>}
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
