import { useState } from 'react'
import { Server, Database, Zap } from 'lucide-react'
import { useEC2, useRDS, useLambdaFns } from '../hooks/useQueries'
import { ExportableChart, ResourceUtilBarChart } from '../components/Charts'
import { PageHeader, LoadingSpinner, EmptyState, ErrorBanner } from '../components/Common'

const TYPE_COLORS = { EC2: '#6366F1', RDS: '#06B6D4', Lambda: '#10B981' }
const TYPE_ICONS  = { EC2: Server, RDS: Database, Lambda: Zap }

function cpuColor(cpu) {
  return cpu >= 70 ? '#10B981' : cpu >= 30 ? '#F59E0B' : '#EF4444'
}

// Normalise resources from different API shapes into a unified table row format
function normaliseEC2(instances = []) {
  return instances.map(i => ({
    id: i.instanceId || i.id,
    name: i.name || i.instanceId,
    type: 'EC2',
    instance: i.instanceType,
    state: i.state,
    cpu: i.cpu || 0,
    cost: i.costPerMonth || 0,
    iamRole: i.iamRole || '—',
    region: i.region || 'us-east-1',
  }))
}

function normaliseRDS(instances = []) {
  return instances.map(i => ({
    id: i.identifier || i.id,
    name: i.identifier || i.id,
    type: 'RDS',
    instance: i.instanceClass,
    state: i.status,
    cpu: i.cpu || 0,
    cost: i.costPerMonth || 0,
    iamRole: '—',
    region: 'us-east-1',
  }))
}

function normaliseLambda(fns = []) {
  return fns.map(f => ({
    id: f.functionName,
    name: f.functionName,
    type: 'Lambda',
    instance: `${f.memorySize || f.memory || 128} MB`,
    state: 'active',
    cpu: 0,
    cost: f.costPerMonth || 0,
    iamRole: '—',
    region: 'us-east-1',
  }))
}

export default function InfrastructurePage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: ec2Data = [], isLoading: ec2Loading, error: ec2Error } = useEC2({})
  const { data: rdsData = [], isLoading: rdsLoading, error: rdsError } = useRDS()
  const { data: lambdaData = [], isLoading: lambdaLoading, error: lambdaError } = useLambdaFns()

  const isLoading = ec2Loading || rdsLoading || lambdaLoading
  const hasError = ec2Error || rdsError || lambdaError

  // Combine all resources
  const allResources = [
    ...normaliseEC2(ec2Data),
    ...normaliseRDS(rdsData),
    ...normaliseLambda(lambdaData),
  ]

  const resources = allResources.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    const q = search.toLowerCase()
    if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false
    return true
  })

  const totalCost = allResources.reduce((s, r) => s + (r.cost || 0), 0)
  const idleCount = allResources.filter(r => r.cpu > 0 && r.cpu < 10).length
  const avgCpu = allResources.filter(r => r.cpu > 0)
  const avgCpuVal = avgCpu.length ? Math.round(avgCpu.reduce((s, r) => s + r.cpu, 0) / avgCpu.length) : 0

  // Build utilisation chart data from live resources
  const utilisationData = allResources
    .filter(r => r.cpu > 0)
    .slice(0, 12)
    .map(r => ({ service: r.name.slice(0, 20), utilisation: Math.round(r.cpu) }))

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="fade-in">
      <PageHeader title="Infrastructure Usage Analysis" subtitle="Analyse resource utilisation and identify cost optimisation opportunities" />
      {hasError && <ErrorBanner error={ec2Error || rdsError || lambdaError} />}

      {/* Summary KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-label">Total Resources</div><div className="kpi-value" style={{ color: 'var(--accent)' }}>{allResources.length}</div><div className="kpi-sub">Across EC2, RDS, Lambda</div></div>
        <div className="kpi-card"><div className="kpi-label">Total Monthly Cost</div><div className="kpi-value" style={{ color: 'var(--accent-green)' }}>${totalCost.toFixed(2)}</div><div className="kpi-sub">All resources</div></div>
        <div className="kpi-card"><div className="kpi-label">Idle Resources</div><div className="kpi-value" style={{ color: 'var(--accent-red)' }}>{idleCount}</div><div className="kpi-sub">CPU &lt;10% — review now</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg CPU Utilisation</div><div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>{avgCpuVal}%</div><div className="kpi-sub">Compute resources</div></div>
      </div>

      {/* Utilisation Chart */}
      {utilisationData.length > 0 ? (
        <ExportableChart title="Resource Utilisation %" subtitle="CPU utilisation by resource">
          <ResourceUtilBarChart data={utilisationData} height={280} />
        </ExportableChart>
      ) : (
        <div className="chart-card">
          <div className="chart-title">Resource Utilisation %</div>
          <EmptyState message="No CPU utilisation data available yet" />
        </div>
      )}

      {/* Resource Table */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title">Resource Inventory</div>
        <div className="data-table-wrapper">
          <div className="table-controls">
            <input className="table-search" placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="tab-bar" style={{ marginBottom: 0 }}>
              {['all', 'EC2', 'RDS', 'Lambda'].map(t => (
                <button key={t} className={`tab-btn ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t === 'all' ? 'All' : t}</button>
              ))}
            </div>
          </div>
          {resources.length === 0
            ? <EmptyState message="No resources found. AWS resources will appear here once connected." />
            : (
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Instance</th>
                  <th>State</th>
                  <th>CPU Util.</th>
                  <th>Monthly Cost</th>
                  <th>IAM Role</th>
                  <th>Region</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(r => {
                  const Icon = TYPE_ICONS[r.type] || Server
                  const color = TYPE_COLORS[r.type] || 'var(--accent)'
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={13} color={color} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ background: `${color}15`, color, border: `1px solid ${color}30`, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{r.type}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{r.instance}</td>
                      <td><span style={{ background: ['running','available','active'].includes(r.state) ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: ['running','available','active'].includes(r.state) ? '#10B981' : '#EF4444', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{r.state}</span></td>
                      <td>
                        {r.cpu > 0 ? (
                          <div className="infra-cpu-bar">
                            <div className="cpu-bar-track">
                              <div className="cpu-bar-fill" style={{ width: `${r.cpu}%`, background: cpuColor(r.cpu) }} />
                            </div>
                            <span style={{ fontSize: 12, color: cpuColor(r.cpu), fontWeight: 600, minWidth: 35 }}>{r.cpu}%</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>N/A</span>}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>${r.cost}/mo</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.iamRole}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.region}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
