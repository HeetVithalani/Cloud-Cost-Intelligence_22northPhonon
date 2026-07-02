import axios from 'axios'

// ── Environment guard ──────────────────────────────────────────
// VITE_API_URL must be set in:
//   .env.development → http://localhost:3001  (local dev with Vite proxy bypass)
//   .env.production  → /api                  (Nginx proxies /api to backend)
//
// If missing: fail loud in dev, fall back to /api in production so the
// build remains functional while the console warns you.
const API_BASE = import.meta.env.VITE_API_URL

if (!API_BASE) {
  if (import.meta.env.DEV) {
    throw new Error(
      '[CloudSense] VITE_API_URL is not set.\n' +
      'Create frontend/.env.development with:\n' +
      '  VITE_API_URL=http://localhost:3001'
    )
  } else {
    console.error(
      '[CloudSense] WARNING: VITE_API_URL is not set in production build. ' +
      'Falling back to /api — ensure Nginx proxies /api to your backend.'
    )
  }
}

// ── Axios instance ─────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE || '/api',   // /api fallback is safe under Nginx reverse proxy
  timeout: 30000,
  withCredentials: true,
})

// ── Global response interceptor ────────────────────────────────
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('cloudsense_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default apiClient
