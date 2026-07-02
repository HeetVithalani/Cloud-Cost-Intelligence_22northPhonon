const router = require('express').Router()
const path = require('path')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')

// Serve the central sample-data.json — used as fallback when live AWS data is unavailable
router.get('/', authMiddleware, (req, res) => {
  try {
    const data = require(path.join(__dirname, '../data/sample-data.json'))
    ok(res, data)
  } catch (e) {
    err(res, 'Sample data not available', 500)
  }
})

module.exports = router
