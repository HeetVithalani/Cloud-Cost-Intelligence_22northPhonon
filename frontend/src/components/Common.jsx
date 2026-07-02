import { AlertCircle } from 'lucide-react'

export function ErrorBanner({ error }) {
  if (!error) return null
  const msg = error?.response?.data?.error || error?.message || 'An error occurred'
  return (
    <div className="error-banner">
      <AlertCircle size={16} />
      <span>{msg}</span>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-header-title">{title}</div>
          {subtitle && <div className="page-header-subtitle">{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
      </div>
    </div>
  )
}

export function LoadingSpinner({ size = 24 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: size, height: size, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20 }}>
      <div style={{ height: 20, width: '40%', background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 16, width: '100%', background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 16, width: '90%', background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 16, width: '95%', background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
    </div>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📂</div>
      <p>{message || 'No data available'}</p>
    </div>
  )
}
