const router = require('express').Router()
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { ddbClient, ScanCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('../config/awsClients')
const { snsClient, sesClient, PublishCommand, SendEmailCommand } = require('../config/awsClients')
const { TABLES, FINAL_JWT_SECRET } = require('../config/constants')
const { authLimiter, passwordResetLimiter, authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')
const { logger } = require('../helpers/logger')
const { logActivity } = require('../helpers/activityLogger')

// ── Register (new user self-registration) ─────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body

    // Validation
    if (!name || !email || !password || !confirmPassword) return err(res, 'All fields are required', 400)
    if (name.trim().length < 2 || name.trim().length > 80) return err(res, 'Name must be 2–80 characters', 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(res, 'Invalid email address', 400)
    if (password !== confirmPassword) return err(res, 'Passwords do not match', 400)
    if (password.length < 8) return err(res, 'Password must be at least 8 characters', 400)
    // Enforce strong password (matches frontend strength check)
    const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/
    if (!strongPw.test(password)) return err(res, 'Password must contain uppercase, lowercase, number, and special character', 400)

    const normalizedEmail = email.toLowerCase().trim()

    // Check email uniqueness
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.users, FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': normalizedEmail } }))
    if (Items?.length > 0) return err(res, 'An account with this email already exists', 409)

    const hash = await bcrypt.hash(password, 12)
    const userId = uuidv4()
    await ddbClient.send(new PutCommand({
      TableName: TABLES.users,
      Item: { UserID: userId, email: normalizedEmail, password: hash, name: name.trim(), role: 'Viewer', active: true, createdAt: new Date().toISOString() },
    }))

    // Auto-login after registration
    const token = jwt.sign({ userId, email: normalizedEmail, role: 'Viewer', name: name.trim() }, FINAL_JWT_SECRET, { expiresIn: '24h' })
    res.cookie('cloudsense_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 })

    await logActivity({ userId, email: normalizedEmail, action: 'REGISTER', page: '/register', ip: req.ip })
    logger.info('New user registered', { userId, email: normalizedEmail })
    ok(res, { user: { id: userId, email: normalizedEmail, name: name.trim(), role: 'Viewer' } })
  } catch (e) {
    logger.error('Register error', { error: e.message })
    err(res, e.message)
  }
})

// ── Login ──────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return err(res, 'Email and password required', 400)
    const normalizedEmail = email.toLowerCase().trim()
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.users, FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': normalizedEmail } }))
    const user = Items?.[0]
    if (!user) return err(res, 'Invalid credentials', 401)
    if (user.active === false) return err(res, 'Your account has been deactivated. Contact an administrator.', 403)
    if (!(await bcrypt.compare(password, user.password))) return err(res, 'Invalid credentials', 401)
    const token = jwt.sign({ userId: user.UserID, email: user.email, role: user.role, name: user.name }, FINAL_JWT_SECRET, { expiresIn: '24h' })
    res.cookie('cloudsense_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 })
    await logActivity({ userId: user.UserID, email: user.email, action: 'LOGIN', page: '/login', ip: req.ip })
    ok(res, { user: { id: user.UserID, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    logger.error('Login error', { error: e.message })
    err(res, e.message)
  }
})

// ── Logout ─────────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  await logActivity({ userId: req.user?.userId, email: req.user?.email, action: 'LOGOUT', page: '/logout', ip: req.ip })
  res.clearCookie('cloudsense_token')
  ok(res, { success: true })
})

// ── Me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => ok(res, req.user))

// ── Forgot Password (with 60-second resend cooldown) ──────────
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email || typeof email !== 'string') return err(res, 'Valid email is required', 400)

    const normalizedEmail = email.toLowerCase().trim()
    const otpKey = `password-reset:${normalizedEmail}`

    // 60-second resend cooldown
    const existing = await ddbClient.send(new GetCommand({ TableName: TABLES.cache, Key: { CacheKey: otpKey } }))
    if (existing.Item) {
      const stored = JSON.parse(existing.Item.data)
      const elapsed = Date.now() - (stored.createdAt || 0)
      const COOLDOWN_MS = 60 * 1000
      if (elapsed < COOLDOWN_MS) {
        const waitSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
        return err(res, `Please wait ${waitSeconds} seconds before requesting a new OTP`, 429)
      }
    }

    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.users, FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': normalizedEmail } }))
    if (Items?.[0]) {
      const otp = crypto.randomInt(100000, 999999).toString()
      const ttl = Math.floor(Date.now() / 1000) + 600 // 10 minutes
      await ddbClient.send(new PutCommand({ TableName: TABLES.cache, Item: { CacheKey: otpKey, data: JSON.stringify({ otp, userId: Items[0].UserID, attempts: 0, createdAt: Date.now() }), ttl } }))

      let sent = false
      const sesFromEmail = process.env.SES_FROM_EMAIL
      const snsTopicArn = process.env.SNS_ALERT_TOPIC_ARN

      if (sesFromEmail && !sent) {
        try {
          await sesClient.send(new SendEmailCommand({
            Source: `CloudSense <${sesFromEmail}>`,
            Destination: { ToAddresses: [normalizedEmail] },
            Message: {
              Subject: { Data: 'CloudSense — Password Reset OTP' },
              Body: {
                Html: { Data: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;background:#080C14;color:#E8F0FE;border-radius:12px;padding:32px"><h2 style="color:#6366F1">🔐 Password Reset</h2><p style="color:#94A3B8">Your OTP expires in <strong>10 minutes</strong>.</p><div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:24px;text-align:center;margin:24px 0"><p style="font-size:13px;color:#64748B;margin:0 0 8px">One-Time Password</p><span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#6366F1;font-family:monospace">${otp}</span></div><p style="color:#64748B;font-size:13px">If you did not request this, ignore this email.</p></div>` },
                Text: { Data: `Your CloudSense password reset OTP is: ${otp}\nExpires in 10 minutes.` },
              },
            },
          }))
          sent = true
          logger.info('OTP sent via SES', { email: normalizedEmail })
        } catch (sesError) {
          logger.error('SES send failed', { error: sesError.message, code: sesError.name })
        }
      }
      if (snsTopicArn && !sent) {
        try {
          await snsClient.send(new PublishCommand({ TopicArn: snsTopicArn, Subject: 'CloudSense Password Reset OTP', Message: `Your OTP: ${otp} (expires in 10 min)` }))
          sent = true
        } catch (snsError) {
          logger.error('SNS send failed', { error: snsError.message })
        }
      }
      if (!sent && process.env.NODE_ENV !== 'production') {
        logger.warn(`[DEV] OTP for ${normalizedEmail}: ${otp}`)
      }
    }
    ok(res, { message: 'If an account with that email exists, you will receive a reset code shortly.' })
  } catch (e) {
    logger.error('Forgot password error', { error: e.message })
    err(res, e.message)
  }
})

// ── Reset Password ─────────────────────────────────────────────
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) return err(res, 'Email, OTP, and new password are required', 400)
    if (newPassword.length < 8) return err(res, 'Password must be at least 8 characters', 400)
    if (!/^\d{6}$/.test(otp)) return err(res, 'Invalid OTP format', 400)
    const otpKey = `password-reset:${email.toLowerCase().trim()}`
    const { Item } = await ddbClient.send(new GetCommand({ TableName: TABLES.cache, Key: { CacheKey: otpKey } }))
    if (!Item) return err(res, 'Invalid or expired OTP', 400)
    if (Item.ttl < Math.floor(Date.now() / 1000)) {
      await ddbClient.send(new DeleteCommand({ TableName: TABLES.cache, Key: { CacheKey: otpKey } }))
      return err(res, 'OTP has expired. Please request a new one.', 400)
    }
    const stored = JSON.parse(Item.data)
    const attempts = (stored.attempts || 0) + 1
    if (attempts > 5) {
      await ddbClient.send(new DeleteCommand({ TableName: TABLES.cache, Key: { CacheKey: otpKey } }))
      return err(res, 'Too many failed attempts. Please request a new OTP.', 429)
    }
    await ddbClient.send(new PutCommand({ TableName: TABLES.cache, Item: { CacheKey: otpKey, data: JSON.stringify({ ...stored, attempts }), ttl: Item.ttl } }))
    const otpBuffer = Buffer.from(otp.trim())
    const storedBuffer = Buffer.from(stored.otp)
    if (otpBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(otpBuffer, storedBuffer)) return err(res, 'Invalid OTP', 400)
    const hash = await bcrypt.hash(newPassword, 12)
    await ddbClient.send(new UpdateCommand({ TableName: TABLES.users, Key: { UserID: stored.userId }, UpdateExpression: 'SET password = :p, updatedAt = :t', ExpressionAttributeValues: { ':p': hash, ':t': new Date().toISOString() } }))
    await ddbClient.send(new DeleteCommand({ TableName: TABLES.cache, Key: { CacheKey: otpKey } }))
    logger.info('Password reset successful', { userId: stored.userId })
    ok(res, { message: 'Password updated successfully. You can now log in.' })
  } catch (e) {
    logger.error('Reset password error', { error: e.message })
    err(res, e.message)
  }
})

module.exports = router
