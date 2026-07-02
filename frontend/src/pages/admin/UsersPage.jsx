import { useState, useContext } from 'react'
import { Users, UserPlus, Trash2, Shield, ToggleLeft, ToggleRight, RefreshCw, X, Check } from 'lucide-react'
import { AuthContext } from '../../context/AuthContext'
import { useAdminUsers } from '../../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../../utils/formatters'

const ROLES = ['Admin', 'Editor', 'Viewer']
const ROLE_COLORS = { Admin: '#EF4444', Editor: '#F59E0B', Viewer: '#10B981' }

export default function UsersPage() {
  const { user: me } = useContext(AuthContext)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: users = [], isLoading } = useAdminUsers()

  // Redirect non-admins
  if (me && me.role !== 'Admin') { navigate('/'); return null }

  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'Viewer', tempPassword: '' })
  const [createError, setCreateError] = useState('')
  const [opError, setOpError] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

  const handleCreate = async e => {
    e.preventDefault(); setCreating(true); setCreateError('')
    try {
      await apiClient.post('/admin/users', createForm)
      setShowCreate(false)
      setCreateForm({ name: '', email: '', role: 'Viewer', tempPassword: '' })
      refresh()
    } catch (ex) { setCreateError(ex.response?.data?.error || 'Failed to create user') }
    finally { setCreating(false) }
  }

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/admin/users/${deleteTarget.id}`)
      setDeleteTarget(null); refresh()
    } catch (ex) { setOpError(ex.response?.data?.error || 'Delete failed') }
  }

  const handleRoleChange = async (userId, role) => {
    try { await apiClient.patch(`/admin/users/${userId}/role`, { role }); refresh() }
    catch (ex) { setOpError(ex.response?.data?.error || 'Role change failed') }
  }

  const handleToggleStatus = async (userId, currentActive) => {
    try { await apiClient.patch(`/admin/users/${userId}/status`, { active: !currentActive }); refresh() }
    catch (ex) { setOpError(ex.response?.data?.error || 'Status change failed') }
  }

  const inp = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>User Management</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{users.length} registered users</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={refresh} className="btn btn-ghost"><RefreshCw size={15} /> Refresh</button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary"><UserPlus size={15} /> Create User</button>
        </div>
      </div>

      {opError && <div className="login-error" style={{ marginBottom: 16 }}>{opError} <button onClick={() => setOpError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 8 }}><X size={14} /></button></div>}

      {/* Users Table */}
      <div className="card no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><RefreshCw size={18} className="spin" style={{ display: 'inline' }} /> Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${ROLE_COLORS[u.role]}22`, border: `1px solid ${ROLE_COLORS[u.role]}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ROLE_COLORS[u.role] }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{u.name}</span>
                    {u.id === me?.id && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', borderRadius: 4, padding: '2px 6px' }}>You</span>}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === me?.id}
                    style={{ ...inp, width: 'auto', padding: '4px 8px', fontSize: 12, color: ROLE_COLORS[u.role], background: `${ROLE_COLORS[u.role]}11`, border: `1px solid ${ROLE_COLORS[u.role]}33`, cursor: u.id === me?.id ? 'not-allowed' : 'pointer' }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => handleToggleStatus(u.id, u.active)}
                    disabled={u.id === me?.id}
                    style={{ background: 'none', border: 'none', cursor: u.id === me?.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: u.active ? '#10B981' : '#EF4444' }}
                  >
                    {u.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    {u.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(u.createdAt)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => setDeleteTarget(u)}
                    disabled={u.id === me?.id}
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '5px 10px', cursor: u.id === me?.id ? 'not-allowed' : 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: u.id === me?.id ? 0.4 : 1, transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (u.id !== me?.id) { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' } }}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New User</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            {createError && <div className="login-error" style={{ marginBottom: 12 }}>{createError}</div>}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Full Name</label><input style={inp} type="text" value={createForm.name} onChange={e => setCreateForm(f => ({...f, name: e.target.value}))} placeholder="Jane Smith" required /></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Email</label><input style={inp} type="email" value={createForm.email} onChange={e => setCreateForm(f => ({...f, email: e.target.value}))} placeholder="jane@company.com" required /></div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Role</label>
                <select style={inp} value={createForm.role} onChange={e => setCreateForm(f => ({...f, role: e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}><label style={lbl}>Temporary Password</label><input style={inp} type="password" value={createForm.tempPassword} onChange={e => setCreateForm(f => ({...f, tempPassword: e.target.value}))} placeholder="Min 8 characters" required minLength={8} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={creating} className="btn btn-primary">{creating ? <><RefreshCw size={14} className="spin" /> Creating...</> : <><Check size={14} /> Create User</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Trash2 size={24} color="#EF4444" /></div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Delete User?</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> ({deleteTarget.email})? This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
                <button onClick={handleDelete} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}><Trash2 size={14} style={{ marginRight: 6 }} />Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
