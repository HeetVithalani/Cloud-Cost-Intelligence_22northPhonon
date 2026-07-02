const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const { FINAL_JWT_SECRET } = require('../config/constants')
const { err } = require('../helpers/response')

// ── Rate Limiters ──────────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 30,
  message: { success: false, error: 'Too many login attempts, please try again later' }
})

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,                    // max 5 reset requests per IP per hour
  message: { success: false, error: 'Too many password reset attempts. Please try again in 1 hour.' }
})

// ── JWT Auth Middleware ────────────────────────────────────────
function authMiddleware(req, res, next) {
  // Cookie-only auth — do NOT accept Bearer tokens to prevent token leakage bypass
  const token = req.cookies?.cloudsense_token
  if (!token) return err(res, 'Unauthorised', 401)
  try {
    const decoded = jwt.verify(token, FINAL_JWT_SECRET)
    req.user = decoded
    next()
  } catch (e) { return err(res, 'Invalid or expired session', 401) }
}

// ── RBAC Middleware ────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user?.role === 'Admin') return next()
  return err(res, 'Forbidden: Admin role required', 403)
}

module.exports = { globalLimiter, authLimiter, passwordResetLimiter, authMiddleware, requireAdmin }
