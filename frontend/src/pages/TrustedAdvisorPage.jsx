import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader, RefreshCw, Clock } from 'lucide-react'
import { useAdvisor } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import { LoadingSpinner, EmptyState, ErrorBanner, PageHeader } from '../components/Common'
import { formatCost } from '../utils/formatters'

const CATEGORIES = ['all', 'security', 'cost_optimizing', 'performance', 'fault_tolerance', 'service_limits']
const CATEGORY_LABELS = {
  all: 'All', security: 'Security', cost_optimizing: 'Cost Optimization',
  performance: 'Performance', fault_tolerance: 'Fault Tolerance', service_limits: 'Service Limits',
}
const CATEGORY_COLORS = {
  security: '#EF4444', cost_optimizing: '#F97316', performance: '#06B6D4',
  fault_tolerance: '#F59E0B', service_limits: '#8B5CF6',
}

const STATUS_CONFIG = {
  ok:            { icon: CheckCircle,   color: '#10B981', label: 'OK' },
  warning:       { icon: AlertTriangle, color: '#F59E0B', label: 'Warning' },
  error:         { icon: XCircle,       color: '#EF4444', label: 'Error' },
  not_available: { icon: Info,          color: 'var(--text-muted)', label: 'Unavailable' },
  in_progress:   { icon: Loader,        color: '#06B6D4', label: 'In Progress' },
}

export default function TrustedAdvisorPage() {
  const { data, isLoading, error, dataUpdatedAt } = useAdvisor()
  const qc = useQueryClient()
  const [category, setCategory] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  // FIX: data is { checks: [...], supportPlan, ... } — access checks array
  const checks = data?.checks || []
  const supportPlan = data?.supportPlan || 'unknown'
  const isBasic = supportPlan === 'basic'

  const normalizeCategory = (cat) => (cat || '').toLowerCase().replace(/\s+/g, '_')

  const filtered = category === 'all'
    ? checks
    : checks.filter(c => normalizeCategory(c.category) === category)

  // Category KPIs
  const catCounts = {}
  for (const cat of CATEGORIES.filter(c => c !== 'all')) {
    catCounts[cat] = {
      total: checks.filter(c => normalizeCategory(c.category) === cat).length,
      warnings: checks.filter(c => normalizeCategory(c.category) === cat && (c.status === 'warning' || c.status === 'error')).length,
    }
  }

  const totalSavings = checks.reduce((s, c) => s + (c.estimatedSavings || 0), 0)
  const totalFlagged = checks.filter(c => c.status === 'warning' || c.status === 'error').length

  const handleRefresh = async () => {
    setRefreshing(true)
    await qc.invalidateQueries(['advisor'])
    setTimeout(() => setRefreshing(false), 1000)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader
        title="Trusted Advisor"
        subtitle="AWS best practice recommendations"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {dataUpdatedAt > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Last refreshed: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
            <button className="btn btn-sm" onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh
            </button>
          </div>
        }
      />
      <ErrorBanner error={error} />

      {/* Basic Plan Warning */}
      {isBasic && (
        <div className="card no-hover" style={{ marginBottom: 20, padding: '14px 18px', borderLeft: '4px solid var(--accent-amber)', background: 'rgba(245,158,11,0.06)' }}>
          <div style={{ fontSize: 13, color: 'var(--accent-amber)', fontWeight: 700, marginBottom: 4 }}>⚠️ Basic Support Plan Detected</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {data?.message || 'Full Trusted Advisor checks (115+) require a Business or Enterprise Support plan.'}{' '}
            {data?.upgradeUrl && <a href={data.upgradeUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Upgrade Support Plan →</a>}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Checks</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{data?.totalChecks || checks.length}</div>
          <div className="kpi-sub">{data?.fetchedChecks || checks.length} fetched</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Flagged Issues</div>
          <div className="kpi-value" style={{ color: totalFlagged > 0 ? '#EF4444' : '#10B981' }}>{totalFlagged}</div>
          <div className="kpi-sub">warning + error</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Est. Monthly Savings</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>{formatCost(totalSavings)}</div>
          <div className="kpi-sub">if all resolved</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Support Plan</div>
          <div className="kpi-value" style={{ color: isBasic ? '#F59E0B' : '#10B981', fontSize: 16 }}>
            {isBasic ? 'Basic' : supportPlan === 'business_or_enterprise' ? 'Business+' : supportPlan}
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`tab-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c] || c}
            {c !== 'all' && catCounts[c]?.warnings > 0 && (
              <span style={{ marginLeft: 6, background: '#EF4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                {catCounts[c].warnings}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Checks grid */}
      {filtered.length === 0 ? (
        <EmptyState message={checks.length === 0
          ? 'No Trusted Advisor checks available. Verify IAM permissions (support:DescribeTrustedAdvisorChecks).'
          : 'No checks match the selected category.'
        } />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((check, i) => {
            const sc = STATUS_CONFIG[check.status] || STATUS_CONFIG.not_available
            const Icon = sc.icon
            const catColor = CATEGORY_COLORS[normalizeCategory(check.category)] || 'var(--accent)'
            const isLocked = isBasic && check.status === 'not_available'

            return (
              <div key={check.id || i} className="card no-hover" style={{ padding: '16px 20px', opacity: isLocked ? 0.6 : 1, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Status icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${sc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={sc.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{check.name}</span>
                      <span style={{ background: sc.color + '18', color: sc.color, border: `1px solid ${sc.color}30`, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                        {sc.label}
                      </span>
                      <span style={{ background: `${catColor}15`, color: catColor, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                        {(check.category || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
                      {check.description?.slice(0, 200)}{check.description?.length > 200 ? '…' : ''}
                    </div>

                    {/* Metrics row */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      {check.flaggedResources > 0 && (
                        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                          ⚠️ {check.flaggedResources} resources flagged
                        </span>
                      )}
                      {check.estimatedSavings > 0 && (
                        <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                          💰 Save {formatCost(check.estimatedSavings)}/mo
                        </span>
                      )}
                      {check.timestamp && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Checked: {new Date(check.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Locked message for Basic plan */}
                    {isLocked && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-amber)', fontWeight: 600 }}>
                        🔒 Upgrade to Business Support to unlock this check
                      </div>
                    )}

                    {/* Recommendation text for actionable checks */}
                    {(check.status === 'warning' || check.status === 'error') && check.error && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {check.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer info */}
      <div className="card no-hover" style={{ marginTop: 24, background: 'var(--bg-elevated)', padding: '14px 18px' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Full Trusted Advisor (115+ checks) requires AWS Business Support Plan.{' '}
          <a href="https://aws.amazon.com/premiumsupport/" target="_blank" rel="noopener noreferrer">Learn more →</a>
          {' '}| Required IAM permissions: <code style={{ fontFamily: 'monospace', fontSize: 11 }}>support:DescribeTrustedAdvisorChecks</code>, <code style={{ fontFamily: 'monospace', fontSize: 11 }}>support:DescribeTrustedAdvisorCheckResult</code>
        </p>
      </div>
    </div>
  )
}
