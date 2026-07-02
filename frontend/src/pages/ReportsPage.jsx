import { useState } from 'react'
import { RefreshCw, FileText, Download, CheckCircle, AlertCircle, FileJson, FileSpreadsheet } from 'lucide-react'
import { subDays } from 'date-fns'
import { useReports } from '../hooks/useQueries'
import { DataTable } from '../components/DataTable'
import { ErrorBanner, PageHeader, LoadingSpinner } from '../components/Common'
import { formatBytes, timeAgo } from '../utils/formatters'
import apiClient from '../api/client'

function Toast({ message, type = 'success', onClose }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      background: type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
      color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'fadeIn 0.3s ease',
    }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 8, fontSize: 16 }}>✕</button>
    </div>
  )
}

export default function ReportsPage() {
  const [type, setType] = useState('cost')
  const [format, setFormat] = useState('csv')
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [genError, setGenError] = useState('')
  const [toast, setToast] = useState(null)
  const { data: reports, isLoading, refetch } = useReports()

  const types = [
    { id: 'cost', icon: '📊', title: 'Cost Report', desc: 'Detailed cost breakdown and analysis' },
    { id: 'health', icon: '💻', title: 'Health Report', desc: 'Infrastructure health and performance' },
    { id: 'iam', icon: '🔐', title: 'IAM Audit', desc: 'Security and access review' },
    { id: 'optimization', icon: '⚡', title: 'Optimization', desc: 'Cost savings and performance gains' },
  ]

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const generate = async () => {
    setGenerating(true); setGenError('')
    try {
      const { data } = await apiClient.post('/reports/generate', {
        type,
        dateRange: { start: subDays(new Date(), 30).toISOString(), end: new Date().toISOString() },
        options: {}
      })
      if (data.success) {
        // If we got a downloadUrl (Lambda PDF), download it
        if (data.data.downloadUrl) {
          window.open(data.data.downloadUrl, '_blank')
          showToast('PDF report downloaded successfully')
        }
        // If inline report, trigger download via our blob method
        else if (data.data.reportId) {
          await downloadReport(data.data.reportId, data.data.format === 'json' ? 'csv' : data.data.format)
        }
        refetch()
      } else {
        setGenError(data.error)
        showToast(data.error || 'Generation failed', 'error')
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'Generation failed'
      setGenError(msg)
      showToast(msg, 'error')
    } finally { setGenerating(false) }
  }

  const downloadReport = async (reportId, fmt = 'csv') => {
    setDownloading(reportId)
    setDownloadProgress(0)
    try {
      const response = await apiClient.get(`/reports/download/${reportId}`, {
        params: { format: fmt },
        responseType: 'blob',
        onDownloadProgress: (e) => {
          if (e.total) setDownloadProgress(Math.round((e.loaded / e.total) * 100))
          else setDownloadProgress(50)
        },
      })

      // Determine filename and MIME type
      const contentDisposition = response.headers['content-disposition']
      let filename = `report.${fmt}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
        if (match) filename = match[1]
      }

      // Create blob and trigger download
      const blob = new Blob([response.data], {
        type: fmt === 'csv' ? 'text/csv' : fmt === 'pdf' ? 'application/pdf' : 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)

      setDownloadProgress(100)
      showToast(`${filename} downloaded successfully`)
    } catch (e) {
      showToast(e.response?.data?.error || 'Download failed', 'error')
    } finally {
      setTimeout(() => { setDownloading(null); setDownloadProgress(0) }, 1000)
    }
  }

  return (
    <div className="fade-in">
      <PageHeader title="Reports" subtitle="Generate and download cost, health, and optimization reports" />

      {/* Report type cards */}
      <div className="report-type-grid">
        {types.map(t => (
          <div key={t.id} className={`report-type-card ${type === t.id ? 'selected' : ''}`} onClick={() => setType(t.id)}>
            <div className="report-icon">{t.icon}</div>
            <div className="report-type-title">{t.title}</div>
            <div className="report-type-desc">{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Format selection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Format:</span>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {[
            { id: 'csv', icon: FileSpreadsheet, label: 'CSV' },
            { id: 'json', icon: FileJson, label: 'JSON' },
          ].map(f => (
            <button key={f.id} className={`tab-btn ${format === f.id ? 'active' : ''}`} onClick={() => setFormat(f.id)}>
              <f.icon size={13} style={{ marginRight: 4 }} /> {f.label}
            </button>
          ))}
        </div>
      </div>

      {genError && <ErrorBanner error={{ message: genError }} />}

      {/* Generate button */}
      <button className="btn btn-primary btn-lg btn-full" onClick={generate} disabled={generating} style={{ marginBottom: 24 }}>
        {generating ? (
          <><RefreshCw size={16} className="spin" /> Generating report...</>
        ) : (
          <><FileText size={16} /> Generate {types.find(t => t.id === type)?.title} ({format.toUpperCase()})</>
        )}
      </button>

      {/* Download progress */}
      {downloading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Downloading report...</span>
            <span>{downloadProgress}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${downloadProgress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* Past reports */}
      <div className="section-title">Past Reports</div>
      <DataTable
        columns={[
          { key: 'name', label: 'Report Name' },
          { key: 'type', label: 'Type', render: r => <span className="pill cyan">{r.type}</span> },
          { key: 'format', label: 'Format', render: r => <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{(r.format || 'json').toUpperCase()}</span> },
          { key: 'generatedAt', label: 'Generated', render: r => timeAgo(r.generatedAt) },
          { key: 'size', label: 'Size', render: r => formatBytes(r.size) },
          { key: 'actions', label: 'Download', sortable: false, render: r => (
            <div style={{ display: 'flex', gap: 6 }}>
              {r.downloadUrl ? (
                <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm"><Download size={12} /> PDF</a>
              ) : (
                <>
                  <button className="btn btn-sm" onClick={() => downloadReport(r.id, 'csv')} disabled={downloading === r.id}>
                    <FileSpreadsheet size={12} /> CSV
                  </button>
                  <button className="btn btn-sm" onClick={() => downloadReport(r.id, 'json')} disabled={downloading === r.id}>
                    <FileJson size={12} /> JSON
                  </button>
                </>
              )}
            </div>
          )},
        ]}
        data={reports || []} loading={isLoading} emptyMessage="No reports generated yet"
      />

      {/* Report contents info */}
      <div className="card no-hover" style={{ marginTop: 20, padding: '14px 18px', background: 'var(--bg-elevated)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>What's included in reports:</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          ✅ Total spend summary &nbsp;&nbsp; ✅ Cost by service breakdown &nbsp;&nbsp; ✅ Monthly cost trend<br />
          ✅ Top 5 savings recommendations &nbsp;&nbsp; ✅ Resource utilisation summary
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
