import { useState } from 'react'
import { RefreshCw, Play, AlertCircle, Activity, Search } from 'lucide-react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts'
import { useAlarms, useMetric, useLogGroups } from '../hooks/useQueries'
import { StatusBadge } from '../components/MetricCard'
import { DataTable } from '../components/DataTable'
import { LoadingSkeleton, EmptyState, ErrorBanner, PageHeader, LoadingSpinner } from '../components/Common'
import { CustomTooltip } from '../components/Charts'
import { timeAgo } from '../utils/formatters'
import apiClient from '../api/client'

const STATUS_COLORS = {
  OK: '#10B981',
  ALARM: '#EF4444',
  INSUFFICIENT_DATA: 'var(--text-muted)',
}

export default function CloudWatchPage() {
  const { data: alarms, isLoading, error, refetch } = useAlarms()
  const [selectedAlarm, setSelectedAlarm] = useState(null)
  const [timeRange, setTimeRange] = useState('24')
  const [alarmSearch, setAlarmSearch] = useState('')
  const { data: metricData, isLoading: metricLoading } = useMetric(selectedAlarm ? { namespace: selectedAlarm.namespace, metric: selectedAlarm.metricName, resourceId: selectedAlarm.dimensions?.[0]?.Value, hours: timeRange } : null)
  const { data: logGroups } = useLogGroups()
  const [logGroup, setLogGroup] = useState('')
  const [query, setQuery] = useState('fields @timestamp, @message | limit 20')
  const [logResults, setLogResults] = useState(null)
  const [logLoading, setLogLoading] = useState(false)

  const runQuery = async () => {
    setLogLoading(true)
    try {
      const { data } = await apiClient.post('/cloudwatch/logs/query', {
        logGroupName: logGroup,
        queryString: query,
        startTime: Date.now() - 24 * 3600 * 1000,
        endTime: Date.now(),
      })
      setLogResults(data.data)
    } catch {
      setLogResults([])
    } finally {
      setLogLoading(false)
    }
  }

  // KPIs
  const total = (alarms || []).length
  const inAlarm = (alarms || []).filter(a => a.stateValue === 'ALARM').length
  const okCount = (alarms || []).filter(a => a.stateValue === 'OK').length
  const insufficientData = total - inAlarm - okCount

  // Filter alarms by search
  const filteredAlarms = alarmSearch
    ? (alarms || []).filter(a =>
        a.alarmName?.toLowerCase().includes(alarmSearch.toLowerCase()) ||
        a.metricName?.toLowerCase().includes(alarmSearch.toLowerCase())
      )
    : (alarms || [])

  return (
    <div className="fade-in">
      <PageHeader
        title="CloudWatch"
        subtitle="Monitor alarms, metrics, and logs"
        actions={
          <button className="btn btn-sm" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />
      <ErrorBanner error={error} onRetry={refetch} />

      {/* KPI Strip */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">TOTAL ALARMS</div>
          <div className="kpi-value" style={{ color: 'var(--accent)' }}>{total}</div>
          <div className="kpi-sub">configured</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">IN ALARM</div>
          <div className="kpi-value" style={{ color: '#EF4444' }}>{inAlarm}</div>
          <div className="kpi-sub">active alerts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">OK</div>
          <div className="kpi-value" style={{ color: '#10B981' }}>{okCount}</div>
          <div className="kpi-sub">healthy</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">INSUFFICIENT DATA</div>
          <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>{insufficientData}</div>
          <div className="kpi-sub">no data yet</div>
        </div>
      </div>

      {/* Alarms + Metric Chart */}
      <div className="split-layout split-30-70" style={{ marginBottom: 24 }}>
        <div className="split-left">
          {/* Alarm search */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div className="table-search">
              <Search size={14} color="var(--text-muted)" />
              <input
                placeholder="Search alarms..."
                value={alarmSearch}
                onChange={e => setAlarmSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? <LoadingSkeleton /> : filteredAlarms.length === 0 ? (
            <EmptyState
              message={total === 0 ? 'No CloudWatch alarms configured. Create alarms in the AWS Console to monitor your infrastructure.' : 'No alarms match your search.'}
              icon="🔔"
            />
          ) : filteredAlarms.map((a, i) => (
            <div
              key={i}
              className={`alert-item ${selectedAlarm === a ? 'selected' : ''}`}
              onClick={() => setSelectedAlarm(a)}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STATUS_COLORS[a.stateValue] || 'var(--text-muted)',
                flexShrink: 0, marginTop: 4,
              }} />
              <div className="alert-content">
                <div className="alert-resource" style={{ fontFamily: 'Space Mono, monospace', fontSize: 12 }}>{a.alarmName}</div>
                <div className="alert-message" style={{ fontSize: 11 }}>
                  {a.metricName} {a.comparisonOperator} {a.threshold}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <StatusBadge status={a.stateValue} />
                  <span className="alert-time">{timeAgo(a.stateUpdatedTimestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="split-right">
          {selectedAlarm ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ marginBottom: 6, fontFamily: 'Space Mono, monospace', fontSize: 15 }}>{selectedAlarm.alarmName}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={selectedAlarm.stateValue} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedAlarm.namespace}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedAlarm.metricName}</span>
                  </div>
                </div>
                <div className="tab-bar" style={{ marginBottom: 0 }}>
                  {[
                    { val: '1', label: '1h' },
                    { val: '6', label: '6h' },
                    { val: '24', label: '24h' },
                    { val: '168', label: '7d' },
                  ].map(h => (
                    <button
                      key={h.val}
                      className={`tab-btn ${timeRange === h.val ? 'active' : ''}`}
                      onClick={() => setTimeRange(h.val)}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alarm details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Threshold</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Orbitron, monospace', color: '#EF4444' }}>{selectedAlarm.threshold || '—'}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Comparison</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedAlarm.comparisonOperator || '—'}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Period</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedAlarm.period ? `${selectedAlarm.period}s` : '—'}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Last Updated</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{timeAgo(selectedAlarm.stateUpdatedTimestamp)}</div>
                </div>
              </div>

              {/* Metric chart */}
              {metricLoading ? (
                <LoadingSpinner text="Loading metric data..." />
              ) : (metricData || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={metricData}>
                    <defs>
                      <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="timestamp" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} fill="url(#metricGrad)" />
                    {selectedAlarm.threshold && (
                      <ReferenceLine y={selectedAlarm.threshold} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Threshold', fill: '#EF4444', fontSize: 11 }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No metric data available for this time range. Check that the alarm's namespace and metric exist." icon="📊" />
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <Activity size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Select an Alarm</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>
                Click an alarm from the list to view its metric chart and threshold details.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Insights */}
      <div className="card no-hover" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Log Insights</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Query CloudWatch Logs with Insights syntax</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Log Group
            </label>
            <select className="form-select" value={logGroup} onChange={e => setLogGroup(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select log group...</option>
              {(logGroups || []).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Query
          </label>
          <textarea
            className="form-textarea"
            value={query}
            onChange={e => setQuery(e.target.value)}
            rows={3}
            placeholder="fields @timestamp, @message | sort @timestamp desc | limit 20"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={runQuery} disabled={!logGroup || logLoading}>
            {logLoading ? (
              <><RefreshCw size={14} className="spin" /> Running...</>
            ) : (
              <><Play size={14} /> Run Query</>
            )}
          </button>
          {!logGroup && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select a log group first</span>}
        </div>

        {logResults && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              Results ({logResults.length} rows)
            </div>
            <DataTable
              columns={[
                { key: 'timestamp', label: 'Timestamp', render: r => <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11 }}>{r.timestamp}</span> },
                { key: 'message', label: 'Message' },
              ]}
              data={logResults}
              searchable={false}
              emptyMessage="No log entries found for this query and time range."
            />
          </div>
        )}
      </div>

      {/* Help footer */}
      <div className="card no-hover" style={{ padding: '14px 18px', background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <strong>Required IAM Permissions:</strong> <code style={{ fontFamily: 'monospace', fontSize: 11 }}>cloudwatch:DescribeAlarms</code>, <code style={{ fontFamily: 'monospace', fontSize: 11 }}>cloudwatch:GetMetricData</code>, <code style={{ fontFamily: 'monospace', fontSize: 11 }}>logs:DescribeLogGroups</code>, <code style={{ fontFamily: 'monospace', fontSize: 11 }}>logs:StartQuery</code>
        </div>
      </div>
    </div>
  )
}
