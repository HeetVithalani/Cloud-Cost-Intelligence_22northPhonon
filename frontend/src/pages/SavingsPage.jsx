import { useState } from 'react'
import { useAdvisor, useSampleData } from '../hooks/useQueries'
import { PageHeader, LoadingSpinner, EmptyState, ErrorBanner } from '../components/Common'

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }
const CATEGORY_COLORS = {
  'Right-Sizing': '#6366F1',
  'Reserved Instances': '#10B981',
  'Idle Resources': '#EF4444',
  'Storage Optimisation': '#F59E0B',
  'Unused Resources': '#EF4444',
  'Network Optimisation': '#06B6D4',
  'cost_optimizing': '#6366F1',
  'performance': '#06B6D4',
  'security': '#EF4444',
  'fault_tolerance': '#F59E0B',
  'service_limits': '#8B5CF6',
}

// Map Trusted Advisor check to a recommendation card shape
function mapAdvisorCheck(check) {
  return {
    id: check.id,
    category: check.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'General',
    priority: check.estimatedSavings > 200 ? 'High' : check.estimatedSavings > 50 ? 'Medium' : 'Low',
    service: check.category?.toUpperCase().includes('EC2') ? 'EC2' : 'AWS',
    resource: check.name,
    issue: check.description?.slice(0, 120) || 'See Trusted Advisor for details',
    recommendation: `${check.flaggedResources} resource(s) flagged. Review in Trusted Advisor console.`,
    estimatedSaving: check.estimatedSavings || 0,
    effort: 'Medium',
  }
}

export default function SavingsPage() {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Use real Trusted Advisor data — if it fails, gracefully degrade
  const { data: advisorData, isLoading, error } = useAdvisor()
  const { data: sampleData } = useSampleData()

  // Build recommendations list from real advisor checks
  const liveRecs = (advisorData?.checks || [])
    .filter(c => c.status === 'warning' || c.status === 'error')
    .map(mapAdvisorCheck)

  // If advisor returns no actionable items, show sample fallback recommendations
  const recommendations = liveRecs.length > 0
    ? liveRecs
    : (sampleData?.savingsRecommendations || [])

  const categories = ['all', ...new Set(recommendations.map(r => r.category))]
  const priorities = ['all', 'High', 'Medium', 'Low']

  const filtered = recommendations
    .filter(r => categoryFilter === 'all' || r.category === categoryFilter)
    .filter(r => priorityFilter === 'all' || r.priority === priorityFilter)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))

  const totalSavings = filtered.reduce((s, r) => s + (r.estimatedSaving || 0), 0)
  const highCount = filtered.filter(r => r.priority === 'High').length

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader
        title="Actionable Savings Recommendations"
        subtitle={advisorData?.supportPlan === 'basic'
          ? '⚠️ Basic Support plan — upgrade to Business/Enterprise for full Trusted Advisor recommendations'
          : 'Cost optimisation recommendations based on Trusted Advisor analysis'}
      />

      {/* Show error as info notice, not a blocking error */}
      {error && (
        <div className="card no-hover" style={{ marginBottom: 16, padding: '12px 18px', borderLeft: '4px solid var(--accent-amber)', background: 'rgba(245,158,11,0.06)' }}>
          <div style={{ fontSize: 13, color: 'var(--accent-amber)', fontWeight: 700, marginBottom: 4 }}>⚠️ Trusted Advisor unavailable</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Could not fetch live recommendations. This often happens with AWS Basic Support plans.
            Ensure IAM permissions include <code style={{ fontFamily: 'monospace' }}>support:DescribeTrustedAdvisorChecks</code> and the backend is running in <code style={{ fontFamily: 'monospace' }}>us-east-1</code>.
            {recommendations.length > 0 && ' Showing sample recommendations below.'}
          </div>
        </div>
      )}

      {/* Basic plan upgrade notice */}
      {advisorData?.supportPlan === 'basic' && advisorData?.upgradeUrl && (
        <div className="card no-hover" style={{ marginBottom: 20, padding: '14px 18px', borderLeft: '4px solid var(--accent-amber)', background: 'rgba(245,158,11,0.06)' }}>
          <div style={{ fontSize: 13, color: 'var(--accent-amber)', fontWeight: 700, marginBottom: 4 }}>Limited Trusted Advisor access</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {advisorData.message}{' '}
            <a href={advisorData.upgradeUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Upgrade Support Plan →</a>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
          <div className="kpi-label">Total Potential Savings</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>${totalSavings.toLocaleString()}</div>
          <div className="kpi-sub">per month</div>
        </div>
        <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
          <div className="kpi-label">Annual Savings</div>
          <div className="kpi-value" style={{ color: 'var(--accent-green)' }}>${(totalSavings * 12).toLocaleString()}</div>
          <div className="kpi-sub">projected</div>
        </div>
        <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
          <div className="kpi-label">High Priority</div>
          <div className="kpi-value" style={{ color: 'var(--accent-red)' }}>{highCount}</div>
          <div className="kpi-sub">action immediately</div>
        </div>
        <div className="kpi-card" style={{ flex: 1, minWidth: 160 }}>
          <div className="kpi-label">Recommendations</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{filtered.length}</div>
          <div className="kpi-sub">matching filters</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {priorities.map(p => (
            <button key={p} className={`tab-btn ${priorityFilter === p ? 'active' : ''}`} onClick={() => setPriorityFilter(p)}>
              {p === 'all' ? 'All Priorities' : p}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        >
          {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      {/* Recommendations list */}
      {filtered.length === 0
        ? <EmptyState message="No recommendations match your filters. Your infrastructure may already be well optimised!" />
        : filtered.map((rec, i) => (
          <div key={rec.id || i} className="rec-card">
            <div className={`rec-priority priority-${rec.priority?.toLowerCase()}`} />
            <div className="rec-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ background: `${CATEGORY_COLORS[rec.category] || 'var(--accent)'}18`, color: CATEGORY_COLORS[rec.category] || 'var(--accent)', border: `1px solid ${CATEGORY_COLORS[rec.category] || 'var(--accent)'}30`, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{rec.category}</span>
                <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}>{rec.service}</span>
                <span style={{ fontSize: 12, color: rec.priority === 'High' ? '#EF4444' : rec.priority === 'Medium' ? '#F59E0B' : '#10B981', fontWeight: 700 }}>{rec.priority} Priority</span>
                {rec.effort && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Effort: {rec.effort}</span>}
              </div>
              <div className="rec-title">{rec.resource}</div>
              <div className="rec-issue">⚠️ {rec.issue}</div>
              <div className="rec-action">✅ {rec.recommendation}</div>
            </div>
            <div className="rec-saving">
              <div className="saving-amount">${rec.estimatedSaving?.toLocaleString() || 0}</div>
              <div className="saving-label">saved/mo</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}
