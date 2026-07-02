const router = require('express').Router()
const { getCostSummary, getCostTrend } = require('../services/costService')
const { costClient, GetCostAndUsageCommand } = require('../config/awsClients')
const { getCache, setCache } = require('../helpers/cache')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')

router.get('/summary', authMiddleware, async (req, res) => {
  try { ok(res, await getCostSummary(req.query.period)) } catch (e) { err(res, e.message) }
})

router.get('/trend', authMiddleware, async (req, res) => {
  // Clamp days between 1 and 365 to prevent API abuse and "Denial of Wallet"
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365)
  try { ok(res, await getCostTrend(days)) } catch (e) { err(res, e.message) }
})

router.get('/by-role', authMiddleware, async (req, res) => {
  try {
    const cached = await getCache('cost-by-role')
    if (cached) return ok(res, cached)
    const { ResultsByTime } = await costClient.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], End: new Date().toISOString().split('T')[0] },
      Granularity: 'MONTHLY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'TAG', Key: 'iamrole' }]
    }))
    const result = []
    for (const t of (ResultsByTime || [])) {
      for (const g of (t.Groups || [])) {
        result.push({ name: g.Keys?.[0]?.replace('iamrole$', '') || 'Untagged', value: parseFloat(g.Metrics?.UnblendedCost?.Amount || 0) })
      }
    }
    await setCache('cost-by-role', result)
    ok(res, result)
  } catch (e) { err(res, e.message) }
})

module.exports = router
