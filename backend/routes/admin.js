const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { ddbClient, ScanCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand, QueryCommand } = require('../config/awsClients')
const { TABLES } = require('../config/constants')
const { authMiddleware, requireAdmin } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')
const { logger } = require('../helpers/logger')
const { logActivity } = require('../helpers/activityLogger')

// All admin routes require authentication + admin role
router.use(authMiddleware, requireAdmin)

// ── GET /api/admin/users — list all users ─────────────────────
router.get('/users', async (req, res) => {
  try {
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.users }))
    const users = (Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(u => ({
      id: u.UserID,
      name: u.name,
      email: u.email,
      role: u.role || 'Viewer',
      active: u.active !== false, // default true if not set
      createdAt: u.createdAt,
    }))
    ok(res, users)
  } catch (e) {
    logger.error('Admin list users error', { error: e.message })
    err(res, e.message)
  }
})

// ── POST /api/admin/users — create user ───────────────────────
router.post('/users', async (req, res) => {
  try {
    const { name, email, role, tempPassword } = req.body
    const validRoles = ['Admin', 'Editor', 'Viewer']

    if (!name || !email || !role || !tempPassword) return err(res, 'name, email, role, and tempPassword are required', 400)
    if (!validRoles.includes(role)) return err(res, 'Invalid role. Must be Admin, Editor, or Viewer', 400)
    if (tempPassword.length < 8) return err(res, 'Temporary password must be at least 8 characters', 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(res, 'Invalid email address', 400)

    const normalizedEmail = email.toLowerCase().trim()
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.users, FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': normalizedEmail } }))
    if (Items?.length > 0) return err(res, 'A user with this email already exists', 409)

    const hash = await bcrypt.hash(tempPassword, 12)
    const userId = uuidv4()
    await ddbClient.send(new PutCommand({
      TableName: TABLES.users,
      Item: { UserID: userId, email: normalizedEmail, password: hash, name: name.trim(), role, active: true, createdAt: new Date().toISOString(), createdBy: req.user.email },
    }))

    await logActivity({ userId: req.user.userId, email: req.user.email, action: 'USER_CREATED', page: '/admin/users', ip: req.ip, meta: { targetUserId: userId, targetEmail: normalizedEmail } })
    logger.info('Admin created user', { by: req.user.email, newUser: normalizedEmail })
    ok(res, { id: userId, email: normalizedEmail, name: name.trim(), role, active: true })
  } catch (e) {
    logger.error('Admin create user error', { error: e.message })
    err(res, e.message)
  }
})

// ── DELETE /api/admin/users/:id — delete user ─────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    // Prevent self-deletion
    if (id === req.user.userId) return err(res, 'You cannot delete your own account', 400)

    // Get user info for logging before deleting
    const { Item } = await ddbClient.send(new GetCommand({ TableName: TABLES.users, Key: { UserID: id } }))
    if (!Item) return err(res, 'User not found', 404)

    await ddbClient.send(new DeleteCommand({ TableName: TABLES.users, Key: { UserID: id } }))
    await logActivity({ userId: req.user.userId, email: req.user.email, action: 'USER_DELETED', page: '/admin/users', ip: req.ip, meta: { targetUserId: id, targetEmail: Item.email } })
    logger.info('Admin deleted user', { by: req.user.email, deleted: Item.email })
    ok(res, { deleted: true })
  } catch (e) {
    logger.error('Admin delete user error', { error: e.message })
    err(res, e.message)
  }
})

// ── PATCH /api/admin/users/:id/role — change role ────────────
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const validRoles = ['Admin', 'Editor', 'Viewer']
    if (!validRoles.includes(role)) return err(res, 'Invalid role', 400)

    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.users,
      Key: { UserID: id },
      UpdateExpression: 'SET #r = :r, updatedAt = :t',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': role, ':t': new Date().toISOString() },
    }))
    await logActivity({ userId: req.user.userId, email: req.user.email, action: 'ROLE_CHANGED', page: '/admin/users', ip: req.ip, meta: { targetUserId: id, newRole: role } })
    ok(res, { updated: true })
  } catch (e) {
    logger.error('Admin change role error', { error: e.message })
    err(res, e.message)
  }
})

// ── PATCH /api/admin/users/:id/status — toggle active ────────
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { active } = req.body
    if (typeof active !== 'boolean') return err(res, 'active must be a boolean', 400)
    if (id === req.user.userId && !active) return err(res, 'You cannot deactivate your own account', 400)

    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.users,
      Key: { UserID: id },
      UpdateExpression: 'SET active = :a, updatedAt = :t',
      ExpressionAttributeValues: { ':a': active, ':t': new Date().toISOString() },
    }))
    await logActivity({ userId: req.user.userId, email: req.user.email, action: active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', page: '/admin/users', ip: req.ip, meta: { targetUserId: id } })
    ok(res, { updated: true, active })
  } catch (e) {
    logger.error('Admin toggle status error', { error: e.message })
    err(res, e.message)
  }
})

// ── GET /api/admin/logs — list activity logs ──────────────────
router.get('/logs', async (req, res) => {
  try {
    const { user: userFilter, action: actionFilter, from, to, limit = 200 } = req.query
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: 'cloudsense-activity-logs', Limit: Math.min(parseInt(limit) || 200, 500) }))

    let logs = (Items || []).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))

    if (userFilter) logs = logs.filter(l => l.email?.includes(userFilter) || l.userId?.includes(userFilter))
    if (actionFilter && actionFilter !== 'all') logs = logs.filter(l => l.action === actionFilter)
    if (from) logs = logs.filter(l => new Date(l.Timestamp) >= new Date(from))
    if (to) logs = logs.filter(l => new Date(l.Timestamp) <= new Date(to))

    ok(res, logs.map(l => ({ id: l.LogID, userId: l.userId, email: l.email, action: l.action, page: l.page, ip: l.ip, timestamp: l.Timestamp })))
  } catch (e) {
    logger.error('Admin logs error', { error: e.message })
    err(res, e.message)
  }
})

// ── GET /api/admin/logs/export — download logs as CSV ────────
router.get('/logs/export', async (req, res) => {
  try {
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: 'cloudsense-activity-logs', Limit: 1000 }))
    const logs = (Items || []).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))

    const header = 'LogID,UserID,Email,Action,Page,IP,Timestamp'
    const rows = logs.map(l => `"${l.LogID}","${l.userId}","${l.email}","${l.action}","${l.page}","${l.ip}","${l.Timestamp}"`)
    const csv = [header, ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="cloudsense-logs-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (e) {
    logger.error('Admin logs export error', { error: e.message })
    err(res, e.message)
  }
})

module.exports = router
