import { useState } from 'react'
import { RefreshCw, FileText, Download, CheckCircle } from 'lucide-react'
import { subDays } from 'date-fns'
import { useReports } from '../hooks/useQueries'
import { DataTable } from '../components/DataTable'
import { ErrorBanner, PageHeader } from '../components/Common'
import { formatBytes, timeAgo } from '../utils/formatters'
import apiClient from '../api/client'

export default function ReportsPage() {
  const [type, setType] = useState('cost')
  const [generating, setGenerating] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [genError, setGenError] = useState('')
  const { data: reports, isLoading } = useReports()
  const types = [
    { id: 'cost', icon: '📊', title: 'Cost Report', desc: 'Detailed cost breakdown and analysis' },
    { id: 'health', icon: '💻', title: 'Health Report', desc: 'Infrastructure health and performance' },
    { id: 'iam', icon: '🔐', title: 'IAM Audit', desc: 'Security and access review' },
    { id: 'optimization', icon: '⚡', title: 'Optimization', desc: 'Cost savings and performance gains' },
  ]
  const generate = async () => {
    setGenerating(true); setGenError(''); setDownloadUrl(null)
    try {
      const { data } = await apiClient.post('/reports/generate', { type, dateRange: { start: subDays(new Date(), 30).toISOString(), end: new Date().toISOString() }, options: {} })
      if (data.success) setDownloadUrl(data.data.downloadUrl); else setGenError(data.error)
    } catch (e) { setGenError(e.response?.data?.error || 'Generation failed') }
    finally { setGenerating(false) }
  }
  return (
    <div className="fade-in">
      <PageHeader title="Reports" subtitle="Generate and download PDF reports" />
      <div className="report-type-grid">
        {types.map(t => (
          <div key={t.id} className={`report-type-card ${type === t.id ? 'selected' : ''}`} onClick={() => setType(t.id)}>
            <div className="report-icon">{t.icon}</div>
            <div className="report-type-title">{t.title}</div>
            <div className="report-type-desc">{t.desc}</div>
          </div>
        ))}
      </div>
      {genError && <ErrorBanner message={genError} />}
      {downloadUrl && (
        <div className="success-banner">
          <CheckCircle size={16} />Report ready! <a href={downloadUrl} target="_blank" rel="noopener noreferrer"><Download size={14} /> Download Report</a>
        </div>
      )}
      <button className="btn btn-primary btn-lg btn-full" onClick={generate} disabled={generating} style={{ marginBottom: 24 }}>
        {generating ? <><RefreshCw size={16} className="spin" /> Generating via Lambda...</> : <><FileText size={16} /> Generate PDF Report</>}
      </button>
      <div className="section-title">Past Reports</div>
      <DataTable
        columns={[
          { key: 'name', label: 'Report Name' },
          { key: 'type', label: 'Type', render: r => <span className="pill cyan">{r.type}</span> },
          { key: 'generatedAt', label: 'Generated', render: r => timeAgo(r.generatedAt) },
          { key: 'size', label: 'Size', render: r => formatBytes(r.size) },
          { key: 'actions', label: '', render: r => <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm"><Download size={12} /></a> },
        ]}
        data={reports || []} loading={isLoading} emptyMessage="No reports generated yet"
      />
    </div>
  )
}
