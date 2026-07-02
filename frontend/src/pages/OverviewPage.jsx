import { useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, TrendingDown, Layers, Bell, Activity } from 'lucide-react'
import { AppContext } from '../context/AppContext'
import { useDashboard, useCostTrend, useSampleData } from '../hooks/useQueries'
import { MetricCard } from '../components/MetricCard'
import { ExportableChart, CostAreaChart, ServiceDonutChart } from '../components/Charts'
import { ErrorBanner, LoadingSpinner, EmptyState } from '../components/Common'
import { formatCost, getStatusColor, timeAgo } from '../utils/formatters'

function KPICard({ label, value, sub, color = 'var(--accent)' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export default function OverviewPage() {
  const { data, isLoading, error } = useDashboard()
  const { data: trendData } = useCostTrend(30)
  const { data: sampleData } = useSampleData()
  const { setAlertCount } = useContext(AppContext)
  const navigate = useNavigate()

  useEffect(() => { if (data?.activeAlerts != null) setAlertCount(data.activeAlerts) }, [data, setAlertCount])

  const d = data || {}
  // Use live data; fall back to empty arrays (not hardcoded mock numbers)
  const costTrend = (trendData?.length ? trendData : d.costTrend) || []
  const serviceData = d.costByService?.length ? d.costByService : (sampleData?.costByService || [])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <ErrorBanner error={error} />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard label="Total Monthly Spend" value={formatCost(d.mtdCost)} sub="Month to date" color="var(--accent)" />
        <KPICard label="Forecast Month-End" value={formatCost(d.forecast)} sub="Projected spend" color="var(--accent-purple)" />
        <KPICard label="Resources Analysed" value={d.totalResources ?? '—'} sub="EC2, RDS, Lambda, S3" color="var(--accent-cyan)" />
        <KPICard label="Active Alerts" value={d.activeAlerts ?? 0} sub={`${d.criticalAlerts || 0} critical`} color="var(--accent-amber)" />
        <KPICard label="Health Score" value={d.healthScore != null ? `${d.healthScore}%` : '—'} sub="Overall infrastructure" color="var(--accent-green)" />
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <MetricCard title="Total Resources" value={d.totalResources} icon={Layers} accentColor="var(--accent)" subtitle={`${d.ec2Count||0} EC2  ${d.s3Count||0} S3  ${d.rdsCount||0} RDS  ${d.lambdaCount||0} Lambda`} loading={isLoading} />
        <MetricCard title="MTD Cost" value={d.mtdCost} unit="$" icon={DollarSign} accentColor="var(--accent-green)" change={d.costChange} changeDir={d.costChangeDir} subtitle={`Forecast: ${formatCost(d.forecast)}`} loading={isLoading} />
        <MetricCard title="Active Alerts" value={d.activeAlerts} icon={Bell} accentColor={d.criticalAlerts > 0 ? 'var(--accent-red)' : 'var(--accent-amber)'} subtitle={`${d.criticalAlerts||0} critical`} loading={isLoading} />
        <MetricCard title="Health Score" value={d.healthScore} unit="%" icon={Activity} accentColor={d.healthScore >= 80 ? 'var(--accent-green)' : d.healthScore >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)'} loading={isLoading} />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ExportableChart title="Cost Trend — Last 30 Days" subtitle="Daily AWS spend (USD)">
          {costTrend.length > 0
            ? <CostAreaChart data={costTrend} />
            : <EmptyState message="No cost trend data available yet" />}
        </ExportableChart>
        <ExportableChart title="Cost by AWS Service" subtitle="Month to date">
          {serviceData.length > 0
            ? <ServiceDonutChart data={serviceData} />
            : <EmptyState message="No service cost data available yet" />}
        </ExportableChart>
      </div>

      {/* Service Health */}
      {d.serviceHealth?.length > 0 && (
        <>
          <div className="section-title">Service Health</div>
          <div className="health-grid">
            <div className="health-row" style={{ background: 'var(--bg-elevated)', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'default' }}>
              <span>Service</span><span style={{ textAlign: 'center' }}>Total</span><span style={{ textAlign: 'center' }}>Healthy</span><span style={{ textAlign: 'center' }}>Warning</span><span style={{ textAlign: 'center' }}>Critical</span><span>Health Bar</span>
            </div>
            {d.serviceHealth.map(s => (
              <div key={s.name} className="health-row" onClick={() => navigate('/resources')}>
                <span className="service-name">{s.name}</span>
                <span className="health-count">{s.total}</span>
                <span className="health-count" style={{ color: 'var(--accent-green)' }}>{s.healthy}</span>
                <span className="health-count" style={{ color: 'var(--accent-amber)' }}>{s.warning}</span>
                <span className="health-count" style={{ color: 'var(--accent-red)' }}>{s.critical}</span>
                <span>
                  <div className="health-bar" style={{ width: 180 }}>
                    <div className="health-segment" style={{ width: `${(s.healthy / Math.max(s.total, 1)) * 100}%`, background: 'var(--accent-green)' }} />
                    <div className="health-segment" style={{ width: `${(s.warning / Math.max(s.total, 1)) * 100}%`, background: 'var(--accent-amber)' }} />
                    <div className="health-segment" style={{ width: `${(s.critical / Math.max(s.total, 1)) * 100}%`, background: 'var(--accent-red)' }} />
                  </div>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent Alerts */}
      {d.recentAlerts?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-title">Recent Alerts</div>
          <div className="card no-hover" style={{ padding: 0 }}>
            {d.recentAlerts.slice(0, 5).map((a, i) => (
              <div key={i} className={`alert-item severity-${a.severity}`}>
                <div className="alert-dot" style={{ background: getStatusColor(a.severity) }} />
                <div className="alert-content">
                  <div className="alert-resource">{a.resource}</div>
                  <div className="alert-message">{a.message}</div>
                  <div className="alert-time">{timeAgo(a.timestamp)}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 16px', textAlign: 'center' }}>
              <a onClick={() => navigate('/alerts')} style={{ cursor: 'pointer', fontSize: 13 }}>View all alerts →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
