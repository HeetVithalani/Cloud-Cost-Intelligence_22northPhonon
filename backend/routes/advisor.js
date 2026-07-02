const router = require('express').Router()
const { getAdvisorChecks } = require('../services/advisorService')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')
const { logger } = require('../helpers/logger')

// GET /api/advisor/checks — returns Trusted Advisor checks with support plan info
router.get('/checks', authMiddleware, async (req, res) => {
  try {
    const result = await getAdvisorChecks()
    ok(res, result)
  } catch (e) {
    logger.error('Advisor route error', { error: e.message })
    err(res, e.message)
  }
})

module.exports = router
