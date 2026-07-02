import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Send, CheckCircle, RefreshCw, Eye, EyeOff, Zap, UserPlus, LogIn } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import apiClient from '../api/client'

// ── Password Strength Logic ─────────────────────────────────────
function getPasswordStrength(pw) {
  const rules = [
    { id: 'length',    label: 'At least 8 characters',       met: pw.length >= 8 },
    { id: 'upper',     label: 'At least 1 uppercase (A-Z)',   met: /[A-Z]/.test(pw) },
    { id: 'lower',     label: 'At least 1 lowercase (a-z)',   met: /[a-z]/.test(pw) },
    { id: 'number',    label: 'At least 1 number (0-9)',      met: /[0-9]/.test(pw) },
    { id: 'special',   label: 'At least 1 special character',met: /[\W_]/.test(pw) },
  ]
  const score = rules.filter(r => r.met).length
  const level = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong'
  return { rules, score, level }
}

function PasswordStrengthBar({ password }) {
  if (!password) return null
  const { rules, score, level } = getPasswordStrength(password)
  const colors = { weak: '#EF4444', medium: '#F59E0B', strong: '#10B981' }
  const labels = { weak: 'Weak', medium: 'Medium', strong: 'Strong' }
  return (
    <div style={{ marginTop: 10 }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= score ? colors[level] : 'var(--border)',
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Password strength</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors[level] }}>{labels[level]}</span>
      </div>
      {/* Rule checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rules.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: r.met ? '#10B981' : '#EF4444', fontSize: 14, lineHeight: 1 }}>{r.met ? '✅' : '❌'}</span>
            <span style={{ color: r.met ? '#10B981' : 'var(--text-muted)' }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

export default function LoginPage() {
  const { login, register } = useContext(AuthContext)
  const navigate = useNavigate()

  // view: 'login' | 'register' | 'forgot' | 'otp' | 'done'
  const [view, setView] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Register fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPw, setRegPw] = useState('')
  const [regConfirmPw, setRegConfirmPw] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)
  const [showRegConfirmPw, setShowRegConfirmPw] = useState(false)

  // Forgot password fields
  const [fpEmail, setFpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmNewPw, setConfirmNewPw] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false)

  const clearErrors = () => { setError(''); setSuccessMsg('') }
  const resetAll = () => { setView('login'); setFpEmail(''); setOtp(''); setNewPw(''); setConfirmNewPw(''); clearErrors() }

  // ── Handlers ──────────────────────────────────────────────────
  const handleLogin = async e => {
    e.preventDefault(); setLoading(true); clearErrors()
    try {
      const r = await login(email, password)
      if (r.success) navigate('/')
      else setError(r.error || 'Login failed')
    } catch (ex) { setError(ex.response?.data?.error || 'Connection failed') }
    finally { setLoading(false) }
  }

  const handleRegister = async e => {
    e.preventDefault(); clearErrors()
    const { level } = getPasswordStrength(regPw)
    if (level !== 'strong') { setError('Please use a strong password (all 5 conditions must be met)'); return }
    if (regPw !== regConfirmPw) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const r = await register(regName, regEmail, regPw, regConfirmPw)
      if (r.success) navigate('/')
      else setError(r.error || 'Registration failed')
    } catch (ex) { setError(ex.response?.data?.error || 'Registration failed') }
    finally { setLoading(false) }
  }

  const handleForgot = async e => {
    e.preventDefault(); setLoading(true); clearErrors()
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email: fpEmail })
      setSuccessMsg(data.data?.message || 'OTP sent!')
      setView('otp')
    } catch (ex) { setError(ex.response?.data?.error || 'Failed to send OTP') }
    finally { setLoading(false) }
  }

  const handleOtp = async e => {
    e.preventDefault(); clearErrors()
    if (newPw !== confirmNewPw) { setError('Passwords do not match'); return }
    const { level } = getPasswordStrength(newPw)
    if (level !== 'strong') { setError('Please use a strong password'); return }
    setLoading(true)
    try {
      const { data } = await apiClient.post('/auth/reset-password', { email: fpEmail, otp, newPassword: newPw })
      setSuccessMsg(data.data?.message || 'Password reset!')
      setView('done')
    } catch (ex) { setError(ex.response?.data?.error || 'Invalid or expired OTP') }
    finally { setLoading(false) }
  }

  // ── Styles ────────────────────────────────────────────────────
  const inp = {
    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  }
  const inpPr = { ...inp, paddingRight: 44 }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }
  const fg = { marginBottom: 16 }

  return (
    <div className="login-page">
      {/* Background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon"><Zap size={24} /></div>
          <h1>CostForge</h1>
          <p>Smarter Costs. Stronger Future.</p>
        </div>

        {/* View tabs for login/register */}
        {(view === 'login' || view === 'register') && (
          <div className="auth-tabs">
            <button className={`auth-tab ${view === 'login' ? 'active' : ''}`} onClick={() => { setView('login'); clearErrors() }}>
              <LogIn size={14} /> Sign In
            </button>
            <button className={`auth-tab ${view === 'register' ? 'active' : ''}`} onClick={() => { setView('register'); clearErrors() }}>
              <UserPlus size={14} /> Create Account
            </button>
          </div>
        )}

        {/* Error / Success banners */}
        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>
        )}
        {successMsg && (
          <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#10B981', marginBottom: 16 }}>
            {successMsg}
          </div>
        )}

        {/* ── LOGIN ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={fg}>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
            </div>
            <div style={fg}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input style={inpPr} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                <EyeToggle show={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><RefreshCw size={16} className="spin" /> Signing in...</> : 'Sign In'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" onClick={() => { setView('forgot'); setFpEmail(email); clearErrors() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13 }}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={fg}>
              <label style={lbl}>Full Name</label>
              <input style={inp} type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Jane Smith" required autoFocus />
            </div>
            <div style={fg}>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="jane@company.com" required />
            </div>
            <div style={fg}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input style={inpPr} type={showRegPw ? 'text' : 'password'} value={regPw} onChange={e => setRegPw(e.target.value)} placeholder="Create a strong password" required />
                <EyeToggle show={showRegPw} onToggle={() => setShowRegPw(v => !v)} />
              </div>
              <PasswordStrengthBar password={regPw} />
            </div>
            <div style={fg}>
              <label style={lbl}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inpPr, borderColor: regConfirmPw && regPw !== regConfirmPw ? '#EF4444' : undefined }}
                  type={showRegConfirmPw ? 'text' : 'password'}
                  value={regConfirmPw}
                  onChange={e => setRegConfirmPw(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
                <EyeToggle show={showRegConfirmPw} onToggle={() => setShowRegConfirmPw(v => !v)} />
              </div>
              {regConfirmPw && regPw !== regConfirmPw && (
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>❌ Passwords do not match</div>
              )}
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading || getPasswordStrength(regPw).level !== 'strong' || regPw !== regConfirmPw}
              style={{ marginTop: 4 }}
            >
              {loading ? <><RefreshCw size={16} className="spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Shield size={24} color="var(--accent)" />
              </div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: 18 }}>Reset Password</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Enter your email to receive a 6-digit OTP</p>
            </div>
            <form onSubmit={handleForgot}>
              <div style={fg}>
                <label style={lbl}>Email Address</label>
                <input style={inp} type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="your@email.com" required autoFocus />
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <><RefreshCw size={16} className="spin" /> Sending OTP...</> : 'Send OTP'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>← Back to sign in</button>
            </div>
          </>
        )}

        {/* ── OTP + NEW PASSWORD ── */}
        {view === 'otp' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Send size={24} color="var(--accent-green)" />
              </div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: 18 }}>Check Your Email</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{fpEmail}</strong></p>
            </div>
            <form onSubmit={handleOtp}>
              <div style={fg}>
                <label style={lbl}>One-Time Password (OTP)</label>
                <input style={{ ...inp, letterSpacing: 10, textAlign: 'center', fontSize: 24, fontFamily: 'monospace' }} type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} required />
              </div>
              <div style={fg}>
                <label style={lbl}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input style={inpPr} type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Create a strong password" required />
                  <EyeToggle show={showNewPw} onToggle={() => setShowNewPw(v => !v)} />
                </div>
                <PasswordStrengthBar password={newPw} />
              </div>
              <div style={fg}>
                <label style={lbl}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inpPr, borderColor: confirmNewPw && newPw !== confirmNewPw ? '#EF4444' : undefined }} type={showConfirmNewPw ? 'text' : 'password'} value={confirmNewPw} onChange={e => setConfirmNewPw(e.target.value)} placeholder="Repeat password" required />
                  <EyeToggle show={showConfirmNewPw} onToggle={() => setShowConfirmNewPw(v => !v)} />
                </div>
              </div>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading || otp.length < 6 || getPasswordStrength(newPw).level !== 'strong'}>
                {loading ? <><RefreshCw size={16} className="spin" /> Resetting...</> : 'Reset Password'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button onClick={() => setView('forgot')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13 }}>Resend OTP</button>
              <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>← Back to sign in</button>
            </div>
          </>
        )}

        {/* ── SUCCESS ── */}
        {view === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={36} color="var(--accent-green)" />
            </div>
            <h3 style={{ margin: '0 0 10px', color: '#10B981', fontSize: 20 }}>Password Reset!</h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)' }}>Your password has been updated. You can now sign in.</p>
            <button className="btn btn-primary btn-full" onClick={resetAll}>Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  )
}
