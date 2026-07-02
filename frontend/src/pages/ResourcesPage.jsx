import { useState } from 'react'
import { Server, HardDrive, Database, Zap } from 'lucide-react'
import { useEC2, useS3, useRDS, useLambdaFns } from '../hooks/useQueries'
import { StatusBadge } from '../components/MetricCard'
import { DataTable } from '../components/DataTable'
import { ErrorBanner, PageHeader } from '../components/Common'
import { formatCost, truncate } from '../utils/formatters'

export default function ResourcesPage() {
  const [tab, setTab] = useState('ec2')
  const [filters] = useState({ region: 'all', iamRole: 'all', status: 'all', search: '' })
  const ec2 = useEC2(tab === 'ec2' ? filters : undefined)
  const s3 = useS3()
  const rds = useRDS()
  const lambda = useLambdaFns()
  const tabs = [{ id: 'ec2', label: 'EC2 Instances', icon: Server }, { id: 's3', label: 'S3 Buckets', icon: HardDrive }, { id: 'rds', label: 'RDS Databases', icon: Database }, { id: 'lambda', label: 'Lambda Functions', icon: Zap }]
  const ec2Cols = [
    { key: 'instanceId', label: 'Instance ID', render: r => <span className="mono">{r.instanceId}</span> },
    { key: 'name', label: 'Name' }, { key: 'instanceType', label: 'Type', render: r => <span className="pill grey">{r.instanceType}</span> },
    { key: 'state', label: 'State', render: r => <StatusBadge status={r.state} /> }, { key: 'region', label: 'Region' },
    { key: 'cpu', label: 'CPU%', render: r => <div className="cpu-bar"><div className="progress-bar"><div className="progress-fill" style={{ width: `${r.cpu || 0}%`, background: r.cpu > 80 ? 'var(--accent-red)' : r.cpu > 60 ? 'var(--accent-amber)' : 'var(--accent-green)' }} /></div><span className="cpu-value">{(r.cpu || 0).toFixed(0)}%</span></div> },
    { key: 'costPerMonth', label: 'Cost/mo', render: r => <span style={{ color: 'var(--accent-green)' }}>{formatCost(r.costPerMonth)}</span> },
  ]
  const s3Cols = [{ key: 'name', label: 'Bucket Name', render: r => <span className="mono">{r.name}</span> }, { key: 'region', label: 'Region' }, { key: 'sizeGB', label: 'Size', render: r => `${(r.sizeGB || 0).toFixed(1)} GB` }, { key: 'objectCount', label: 'Objects' }, { key: 'publicAccess', label: 'Public', render: r => r.publicAccess ? <span className="pill red">PUBLIC</span> : <span className="pill green">Private</span> }, { key: 'costPerMonth', label: 'Cost/mo', render: r => <span style={{ color: 'var(--accent-green)' }}>{formatCost(r.costPerMonth)}</span> }]
  const rdsCols = [{ key: 'identifier', label: 'Identifier', render: r => <span className="mono">{r.identifier}</span> }, { key: 'engine', label: 'Engine', render: r => <span className="pill cyan">{r.engine}</span> }, { key: 'instanceClass', label: 'Class' }, { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> }, { key: 'storage', label: 'Storage', render: r => `${r.storage || 0} GB` }, { key: 'connections', label: 'Connections' }, { key: 'cpu', label: 'CPU%', render: r => <span>{(r.cpu || 0).toFixed(0)}%</span> }, { key: 'multiAZ', label: 'Multi-AZ', render: r => r.multiAZ ? 'Yes' : 'No' }, { key: 'costPerMonth', label: 'Cost/mo', render: r => <span style={{ color: 'var(--accent-green)' }}>{formatCost(r.costPerMonth)}</span> }]
  const lambdaCols = [{ key: 'functionName', label: 'Function', render: r => <span className="mono">{truncate(r.functionName, 30)}</span> }, { key: 'runtime', label: 'Runtime', render: r => <span className="pill purple">{r.runtime}</span> }, { key: 'memory', label: 'Memory', render: r => `${r.memory} MB` }, { key: 'invocations', label: 'Invocations 7d' }, { key: 'avgDuration', label: 'Avg Duration', render: r => `${(r.avgDuration || 0).toFixed(0)}ms` }, { key: 'errorRate', label: 'Error Rate', render: r => <span style={{ color: r.errorRate > 5 ? 'var(--accent-red)' : r.errorRate > 1 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>{(r.errorRate || 0).toFixed(1)}%</span> }, { key: 'costPerMonth', label: 'Cost/mo', render: r => <span style={{ color: 'var(--accent-green)' }}>{formatCost(r.costPerMonth)}</span> }]
  const curr = tab === 'ec2' ? ec2 : tab === 's3' ? s3 : tab === 'rds' ? rds : lambda
  const cols = tab === 'ec2' ? ec2Cols : tab === 's3' ? s3Cols : tab === 'rds' ? rdsCols : lambdaCols
  return (
    <div className="fade-in">
      <PageHeader title="Resources" subtitle="Monitor all AWS resources across services" />
      <div className="tab-bar">{tabs.map(t => <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}><t.icon size={14} style={{ marginRight: 6 }} />{t.label}</button>)}</div>
      <ErrorBanner error={curr.error} />
      <DataTable columns={cols} data={curr.data || []} loading={curr.isLoading} emptyMessage={`No ${tab} resources found`} />
    </div>
  )
}
