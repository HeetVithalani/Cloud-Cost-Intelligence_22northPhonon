import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useAdvisor } from '../hooks/useQueries'
import { LoadingSkeleton, ErrorBanner, PageHeader } from '../components/Common'
import { formatCost } from '../utils/formatters'

export default function TrustedAdvisorPage() {
  const { data, isLoading, error } = useAdvisor()
  const [category, setCategory] = useState('all')
  const cats = ['all', 'security', 'cost_optimization', 'performance', 'fault_tolerance', 'service_limits']
  const filtered = category === 'all' ? (data || []) : (data || []).filter(c => c.category?.toLowerCase().replace(/\s+/g, '_') === category)
  const iconMap = { ok: CheckCircle, error: XCircle, warning: AlertTriangle, not_available: Info }
  const colorMap = { ok: 'var(--accent-green)', error: 'var(--accent-red)', warning: 'var(--accent-amber)', not_available: 'var(--text-muted)' }
  return (
    <div className="fade-in">
      <PageHeader title="Trusted Advisor" subtitle="AWS best practice recommendations" />
      <ErrorBanner error={error} />
      <div className="tab-bar">{cats.map(c => <button key={c} className={`tab-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c === 'all' ? 'All' : c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</button>)}</div>
      {isLoading ? <LoadingSkeleton rows={6} /> : (
        <div className="checks-grid">
          {filtered.map((check, i) => {
            const Icon = iconMap[check.status] || Info
            return (
              <div key={i} className="check-card">
                <div className="check-header">
                  <Icon size={20} color={colorMap[check.status]} />
                  <div className="check-name">{check.name}</div>
                  <span className="pill grey">{check.category}</span>
                </div>
                <div className="check-desc">{check.description}</div>
                {check.flaggedResources > 0 && <span className="pill amber">{check.flaggedResources} resources affected</span>}
                {check.estimatedSavings && <span className="pill green" style={{ marginLeft: 8 }}>Save {formatCost(check.estimatedSavings)}/mo</span>}
              </div>
            )
          })}
        </div>
      )}
      <div className="card no-hover" style={{ marginTop: 24, background: 'var(--bg-elevated)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Full Trusted Advisor (115+ checks) requires AWS Business Support Plan. <a href="https://aws.amazon.com/premiumsupport/" target="_blank" rel="noopener noreferrer">Learn more →</a></p>
      </div>
    </div>
  )
}
