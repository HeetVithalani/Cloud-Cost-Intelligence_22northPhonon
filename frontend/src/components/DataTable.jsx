import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { LoadingSkeleton, EmptyState } from './Common'

export function DataTable({ columns = [], data = [], onRowClick, loading, emptyMessage = 'No data found', searchable = true, expandRow }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState(null)
  const perPage = 25

  const filtered = data.filter(row => !search || columns.some(c => String(row[c.key] || '').toLowerCase().includes(search.toLowerCase())))
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        const r = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''))
        return sortDir === 'asc' ? r : -r
      })
    : filtered
  const paged = sorted.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(sorted.length / perPage)
  const handleSort = k => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc') } }

  if (loading) return <div className="data-table-container"><LoadingSkeleton /></div>
  return (
    <div className="data-table-container">
      {searchable && (
        <div className="data-table-toolbar">
          <div className="table-search">
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sorted.length} results</span>
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} onClick={() => c.sortable !== false && handleSort(c.key)}>
                {c.label}{sortKey === c.key && <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.length === 0
            ? <tr><td colSpan={columns.length}><EmptyState message={emptyMessage} /></td></tr>
            : paged.map((row, i) => (
              <React.Fragment key={row.id || i}>
                <tr onClick={() => { onRowClick?.(row); expandRow && setExpanded(expanded === i ? null : i) }}>
                  {columns.map(c => <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>)}
                </tr>
                {expandRow && expanded === i && <tr><td colSpan={columns.length}>{expandRow(row)}</td></tr>}
              </React.Fragment>
            ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="table-pagination">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="pagination-buttons">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            {(() => { const s = Math.max(0, Math.min(page - 2, totalPages - 5)), e = Math.min(totalPages, s + 5); return Array.from({ length: e - s }, (_, i) => { const p = s + i; return <button key={p} className={page === p ? 'active-page' : ''} onClick={() => setPage(p)}>{p + 1}</button> }) })()}
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}
    </div>
  )
}
