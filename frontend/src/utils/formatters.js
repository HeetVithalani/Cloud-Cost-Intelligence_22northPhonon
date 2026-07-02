import { formatDistanceToNow } from 'date-fns'

export const formatCost = n =>
  n == null ? '$0.00' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatBytes = b => {
  if (!b) return '0 B'
  const k = 1024
  const s = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`
}

export const timeAgo = d => {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }) }
  catch { return 'N/A' }
}

export const getStatusColor = s => {
  const m = {
    running: 'var(--accent-green)', stopped: 'var(--accent-red)', pending: 'var(--accent-amber)',
    healthy: 'var(--accent-green)', critical: 'var(--accent-red)', warning: 'var(--accent-amber)',
    ok: 'var(--accent-green)', alarm: 'var(--accent-red)', available: 'var(--accent-green)',
  }
  return m[s?.toLowerCase()] || 'var(--text-muted)'
}

export const truncate = (s, n = 30) => s?.length > n ? s.slice(0, n) + '...' : s || ''

export const REGIONS = ['us-east-1', 'us-west-2', 'ap-south-1', 'eu-west-1']

export const COLORS = ['#00D4FF', '#00FF88', '#FFB800', '#FF3B5C', '#8B5CF6', '#FF6B6B', '#4ECDC4', '#45B7D1']
