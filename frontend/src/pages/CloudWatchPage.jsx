import { useState } from 'react'
import { RefreshCw, Play } from 'lucide-react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useAlarms, useMetric, useLogGroups } from '../hooks/useQueries'
import { StatusBadge } from '../components/MetricCard'
import { DataTable } from '../components/DataTable'
import { LoadingSkeleton, EmptyState, ErrorBanner, PageHeader } from '../components/Common'
import { CustomTooltip } from '../components/Charts'
import { timeAgo } from '../utils/formatters'
import apiClient from '../api/client'

export default function CloudWatchPage() {
  const { data: alarms, isLoading, error } = useAlarms()
  const [selectedAlarm, setSelectedAlarm] = useState(null)
  const [timeRange, setTimeRange] = useState('24')
  const { data: metricData } = useMetric(selectedAlarm ? { namespace: selectedAlarm.namespace, metric: selectedAlarm.metricName, resourceId: selectedAlarm.dimensions?.[0]?.Value, hours: timeRange } : null)
  const { data: logGroups } = useLogGroups()
  const [logGroup, setLogGroup] = useState('')
  const [query, setQuery] = useState('fields @timestamp, @message | limit 20')
  const [logResults, setLogResults] = useState(null)
  const [logLoading, setLogLoading] = useState(false)
  const runQuery = async () => {
    setLogLoading(true)
    try { const { data } = await apiClient.post('/cloudwatch/logs/query', { logGroupName: logGroup, queryString: query, startTime: Date.now() - 24 * 3600 * 1000, endTime: Date.now() }); setLogResults(data.data) }
    catch { setLogResults([]) }
    finally { setLogLoading(false) }
  }
  return (
    <div className="fade-in">
      <PageHeader title="CloudWatch" subtitle="Monitor alarms, metrics, and logs" />
      <ErrorBanner error={error} />
      <div className="split-layout split-30-70" style={{ marginBottom: 24 }}>
        <div className="split-left">
          {isLoading ? <LoadingSkeleton /> : (alarms || []).map((a, i) => (
            <div key={i} className={`alert-item ${selectedAlarm === a ? 'selected' : ''}`} onClick={() => setSelectedAlarm(a)}>
              <StatusBadge status={a.stateValue} />
              <div className="alert-content">
                <div className="alert-resource" style={{ fontFamily: 'Space Mono' }}>{a.alarmName}</div>
                <div className="alert-message">{a.metricName} {a.comparisonOperator} {a.threshold}</div>
                <div className="alert-time">{timeAgo(a.stateUpdatedTimestamp)}</div>
              </div>
            </div>
          ))}
          {!isLoading && !alarms?.length && <EmptyState message="No alarms configured" />}
        </div>
        <div className="split-right">
          {selectedAlarm ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div><h3 style={{ marginBottom: 4 }}>{selectedAlarm.alarmName}</h3><StatusBadge status={selectedAlarm.stateValue} /></div>
                <div className="status-pills">{['1', '6', '24', '168'].map(h => <button key={h} className={`status-pill ${timeRange === h ? 'active' : ''}`} onClick={() => setTimeRange(h)}>{h === '168' ? '7d' : h + 'h'}</button>)}</div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={metricData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="timestamp" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={2} dot={false} />
                  {selectedAlarm.threshold && <ReferenceLine y={selectedAlarm.threshold} stroke="var(--accent-red)" strokeDasharray="5 5" label={{ value: 'Threshold', fill: 'var(--accent-red)', fontSize: 11 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="Select an alarm" message="Click an alarm to view its metric chart" />}
        </div>
      </div>
      <div className="card no-hover" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Log Insights</div>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <select className="form-select" value={logGroup} onChange={e => setLogGroup(e.target.value)}>
              <option value="">Select log group...</option>
              {(logGroups || []).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group"><textarea className="form-textarea" value={query} onChange={e => setQuery(e.target.value)} rows={2} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={runQuery} disabled={!logGroup || logLoading}>
            {logLoading ? <><RefreshCw size={14} className="spin" /> Running...</> : <><Play size={14} /> Run Query</>}
          </button>
        </div>
        {logResults && (
          <div style={{ marginTop: 16 }}>
            <DataTable columns={[{ key: 'timestamp', label: 'Timestamp', render: r => <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{r.timestamp}</span> }, { key: 'message', label: 'Message' }]} data={logResults} searchable={false} />
          </div>
        )}
      </div>
    </div>
  )
}
