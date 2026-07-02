import { useState } from 'react'
import { Search } from 'lucide-react'
import { MOCK_API_ENDPOINTS } from '../data/mockData'

const METHOD_STYLES = {
  GET:    'method-GET',
  POST:   'method-POST',
  DELETE: 'method-DELETE',
  PATCH:  'method-PATCH',
  PUT:    'method-PUT',
}

const AUTH_LABELS = {
  false:   { label: 'Public', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  true:    { label: 'Auth Required', color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  'Admin': { label: 'Admin Only', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function ApiDocsPage() {
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  const endpoints = MOCK_API_ENDPOINTS.filter(ep => {
    const matchSearch = !search || ep.path.toLowerCase().includes(search.toLowerCase()) || ep.description.toLowerCase().includes(search.toLowerCase())
    const matchMethod = methodFilter === 'all' || ep.method === methodFilter
    return matchSearch && matchMethod
  })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>API Documentation</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>CloudSense REST API — {MOCK_API_ENDPOINTS.length} endpoints · Base URL: <code style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4 }}>{import.meta.env.VITE_API_URL || '/api'}</code></p>
      </div>

      {/* Auth info */}
      <div className="card no-hover" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Authentication</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          The API uses <strong style={{ color: 'var(--text-primary)' }}>HttpOnly cookie-based JWT authentication</strong>. Call <code style={{ fontFamily: 'monospace', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: 4 }}>POST /api/auth/login</code> to authenticate. The server sets a <code style={{ fontFamily: 'monospace' }}>cloudsense_token</code> cookie automatically. Include <code style={{ fontFamily: 'monospace' }}>withCredentials: true</code> in all requests.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Search endpoints..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          {['all', 'GET', 'POST', 'PATCH', 'DELETE'].map(m => (
            <button key={m} className={`tab-btn ${methodFilter === m ? 'active' : ''}`} onClick={() => setMethodFilter(m)}>{m === 'all' ? 'All' : m}</button>
          ))}
        </div>
      </div>

      {/* Endpoints table */}
      <div className="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Auth</th>
              <th>Description</th>
              <th>Request Body / Params</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep, i) => {
              const authInfo = AUTH_LABELS[ep.auth] || AUTH_LABELS[true]
              return (
                <tr key={i}>
                  <td><span className={`api-method ${METHOD_STYLES[ep.method]}`}>{ep.method}</span></td>
                  <td><span className="api-path">{ep.path}</span></td>
                  <td><span style={{ background: authInfo.bg, color: authInfo.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{authInfo.label}</span></td>
                  <td style={{ maxWidth: 260, whiteSpace: 'normal', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{ep.description}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'normal' }}>{ep.body}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 240, whiteSpace: 'normal' }}>{ep.response}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
