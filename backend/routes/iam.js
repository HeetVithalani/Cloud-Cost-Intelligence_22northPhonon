const router = require('express').Router()
const { getIAMRoles, getResourcesByRole } = require('../services/iamService')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')

router.get('/roles', authMiddleware, async (req, res) => {
  try { ok(res, await getIAMRoles()) } catch (e) { err(res, e.message) }
})

router.get('/resources-by-role/:roleName', authMiddleware, async (req, res) => {
  // Sanitize roleName to prevent IDOR / path traversal
  const roleName = req.params.roleName
  if (!roleName || typeof roleName !== 'string' || !/^[\w+=,.@\-]{1,128}$/.test(roleName)) {
    return err(res, 'Invalid role name format', 400)
  }
  try { ok(res, await getResourcesByRole(roleName)) } catch (e) { err(res, e.message) }
})

module.exports = router
