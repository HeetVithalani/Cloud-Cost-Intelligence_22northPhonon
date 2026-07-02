import { AlertCircle, RefreshCw } from 'lucide-react'

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null

  // Extract a human-readable message
  let msg = 'An error occurred'
  if (typeof error === 'string') {
    msg = error
  } else if (error?.response?.data?.error) {
    msg = error.response.data.error
  } else if (error?.message) {
    msg = error.message
  }

  // Clean up technical React Query error messages
  if (msg.includes('data is undefined') || msg.includes('undefined')) {
    msg = 'Unable to load data. The server may be starting up or the service is temporarily unavailable.'
  }
  if (msg.includes('Network Error') || msg.includes('ERR_NETWORK')) {
    msg = 'Network error — please check your connection and try again.'
  }
  if (msg.includes('500') || msg.includes('internal server error') || msg.includes('Internal Server Error')) {
    msg = 'Server error — the backend encountered an issue. Check server logs for details.'
  }
  if (msg.includes('502') || msg.includes('Bad Gateway')) {
    msg = 'Backend unreachable — the server may be restarting. Please try again in a moment.'
  }
  if (msg.includes('403') || msg.includes('Forbidden')) {
    msg = 'Permission denied — your account may not have access to this resource.'
  }
  if (msg.includes('CORS')) {
    msg = 'Cross-origin request blocked — check FRONTEND_URL environment variable on the backend.'
  }

  return (
    <div className="error-banner" style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 18px', marginBottom: 16,
      background: 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: 10, fontSize: 13,
      color: '#F87171',
    }}>
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{msg}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: 'rgba(239, 68, 68, 0.15)', border: 'none',
          color: '#F87171', cursor: 'pointer', padding: '4px 10px',
          borderRadius: 6, fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
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

export function LoadingSpinner({ size = 24, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
      <div style={{ width: size, height: size, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      {text && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{text}</span>}
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20 }}>
      <div style={{ height: 20, width: '40%', background: 'var(--bg-elevated)', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 16, width: '100%', background: 'var(--bg-elevated)', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 16, width: '90%', background: 'var(--bg-elevated)', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
      <div style={{ height: 16, width: '95%', background: 'var(--bg-elevated)', borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
    </div>
  )
}

export function EmptyState({ message, icon }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon || '📂'}</div>
      <p>{message || 'No data available'}</p>
    </div>
  )
}
