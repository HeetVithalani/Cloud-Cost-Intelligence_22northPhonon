import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Zap, BarChart2 } from 'lucide-react'
import { useCosts, useCostTrend, useCostByRole } from '../hooks/useQueries'
import { MetricCard } from '../components/MetricCard'
import { CostAreaChart, ServiceDonutChart } from '../components/Charts'
import { DataTable } from '../components/DataTable'
import { ErrorBanner, PageHeader } from '../components/Common'
import { formatCost } from '../utils/formatters'

export default function CostFinOpsPage() {
  const [period, setPeriod] = useState('thisMonth')
  const { data: costs, isLoading, error } = useCosts(period)
  const { data: trend } = useCostTrend(period === 'last3Months' ? 90 : 30)
  const { data: byRole } = useCostByRole()
  const periods = [{ id: 'thisMonth', label: 'This Month' }, { id: 'lastMonth', label: 'Last Month' }, { id: 'last3Months', label: 'Last 3 Months' }]
  const c = costs || {}
  return (
    <div className="fade-in">
      <PageHeader title="Cost & FinOps" subtitle="Analyze cloud spending and optimize costs" />
      <div className="tab-bar">{periods.map(p => <button key={p.id} className={`tab-btn ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div>
      <ErrorBanner error={error} />
      <div className="metrics-grid">
        <MetricCard title="MTD Spend" value={c.mtd} unit="$" icon={DollarSign} accentColor="var(--accent-cyan)" loading={isLoading} />
        <MetricCard title="Projected Month End" value={c.forecast} unit="$" icon={TrendingUp} accentColor="var(--accent-purple)" loading={isLoading} />
        <MetricCard title="Daily Average" value={c.dailyAvg} unit="$" icon={BarChart2} accentColor="var(--accent-amber)" loading={isLoading} />
        <MetricCard title="Biggest Driver" value={c.byService?.[0]?.mtd || 0} unit="$" icon={Zap} accentColor="var(--accent-cyan)" subtitle={c.biggestDriver || 'N/A'} loading={isLoading} />
        <MetricCard title="vs Last Month" value={c.changePercent} unit="%" icon={c.changeDir === 'up' ? TrendingUp : TrendingDown} accentColor={c.changeDir === 'up' ? 'var(--accent-red)' : 'var(--accent-green)'} loading={isLoading} />
      </div>
      <div className="charts-grid">
        <div className="chart-card"><div className="chart-title">Cost Trend</div><CostAreaChart data={trend || []} /></div>
        <div className="chart-card"><div className="chart-title">Cost by IAM Role/Team</div><ServiceDonutChart data={byRole || []} /></div>
      </div>
      {c.byService?.length > 0 && (
        <DataTable
          columns={[{ key: 'service', label: 'Service' }, { key: 'dailyAvg', label: 'Daily Avg', render: r => formatCost(r.dailyAvg) }, { key: 'mtd', label: 'MTD', render: r => formatCost(r.mtd) }, { key: 'projected', label: 'Projected', render: r => formatCost(r.projected) }, { key: 'change', label: 'vs Last Month', render: r => <span style={{ color: r.changeDir === 'up' ? 'var(--accent-red)' : 'var(--accent-green)' }}>{r.change}</span> }]}
          data={c.byService} searchable={false}
        />
      )}
    </div>
  )
}
