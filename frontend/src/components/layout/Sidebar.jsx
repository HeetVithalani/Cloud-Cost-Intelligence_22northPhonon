import { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Layers, DollarSign, Bell, Activity, Server, Shield, CheckCircle, FileText,
  ChevronLeft, ChevronRight, Sun, Moon, Zap, Users, ScrollText,
  TrendingDown, BarChart3, UserCheck, Code2
} from 'lucide-react'
import { AppContext } from '../../context/AppContext'
import { AuthContext } from '../../context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { to: '/', icon: Layers, label: 'Overview', end: true },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { to: '/resources', icon: Server, label: 'Resources' },
      { to: '/iam', icon: Shield, label: 'IAM Roles' },
      { to: '/cloudwatch', icon: Activity, label: 'CloudWatch' },
    ],
  },
  {
    label: 'Cost Intelligence',
    items: [
      { to: '/cost', icon: DollarSign, label: 'Cost & FinOps' },
      { to: '/advisor', icon: CheckCircle, label: 'Trusted Advisor' },
      { to: '/infrastructure', icon: BarChart3, label: 'Usage Analysis' },
      { to: '/savings', icon: TrendingDown, label: 'Savings' },
    ],
  },
  {
    label: 'Advanced Costing',
    items: [
      { to: '/role-costing', icon: UserCheck, label: 'Role Based Costing' },
      { to: '/api-costing', icon: Code2, label: 'API Based Costing' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/alerts', icon: Bell, label: 'Alerts', badge: true },
      { to: '/reports', icon: FileText, label: 'Reports' },
    ],
  },

]

const ADMIN_ITEMS = [
  { to: '/admin/users', icon: Users, label: 'User Management' },
  { to: '/admin/logs', icon: ScrollText, label: 'Activity Logs' },
]

export function Sidebar() {
  const { alertCount, sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useContext(AppContext)
  const { user } = useContext(AuthContext)
  const isCollapsed = sidebarCollapsed

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img
          src="/assets/costforge-logo.jpeg"
          alt="CostForge"
          className="logo-img"
        />
        <div className="logo-text-group">
          <div className="logo-name">CostForge</div>
          <div className="logo-sub">Smarter Costs</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={17} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {item.badge && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Admin section — only for Admin role */}
        {user?.role === 'Admin' && (
          <div>
            <div className="nav-section-label">Admin</div>
            {ADMIN_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={17} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleTheme} title={isCollapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button className="sidebar-collapse-btn" onClick={toggleSidebar} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          <span>Collapse</span>
        </button>

        <div className="free-tier-badge" style={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}>● AWS Free Tier</div>
        <div className="sidebar-version">v2.0.0</div>
      </div>
    </aside>
  )
}
