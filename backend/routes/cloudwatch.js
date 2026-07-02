const router = require('express').Router()
const { getAlarms, getMetricData } = require('../services/cloudwatchService')
const { cwLogsClient, DescribeLogGroupsCommand, StartQueryCommand, GetQueryResultsCommand } = require('../config/awsClients')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')

router.get('/alarms', authMiddleware, async (req, res) => {
  try { ok(res, await getAlarms()) } catch (e) { err(res, e.message) }
})

router.get('/metric', authMiddleware, async (req, res) => {
  try {
    const { namespace, metric, resourceId, hours } = req.query
    ok(res, await getMetricData(namespace, metric, resourceId, parseInt(hours) || 24))
  } catch (e) { err(res, e.message) }
})

router.get('/logs/groups', authMiddleware, async (req, res) => {
  try {
    const { logGroups } = await cwLogsClient.send(new DescribeLogGroupsCommand({ limit: 50 }))
    ok(res, (logGroups || []).map(g => g.logGroupName))
  } catch (e) { err(res, e.message) }
})

router.post('/logs/query', authMiddleware, async (req, res) => {
  try {
    const { logGroupName, queryString, startTime, endTime } = req.body
    // Validate logGroupName format to prevent log group hopping
    if (!logGroupName || typeof logGroupName !== 'string' || !/^\/[a-zA-Z0-9/_\-\.]+$/.test(logGroupName)) {
      return err(res, 'Invalid log group name', 400)
    }
    // Restrict queryString length to prevent abuse
    if (!queryString || queryString.length > 2000) return err(res, 'Query string is too long or missing', 400)
    // Validate time range — both must be numbers and range must not exceed 7 days
    const st = parseInt(startTime); const et = parseInt(endTime)
    if (isNaN(st) || isNaN(et) || et <= st) return err(res, 'Invalid time range', 400)
    const maxRange = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    if ((et - st) > maxRange) return err(res, 'Time range must not exceed 7 days', 400)
    const { queryId } = await cwLogsClient.send(new StartQueryCommand({ logGroupName, queryString, startTime: Math.floor(st / 1000), endTime: Math.floor(et / 1000) }))
    let status = 'Running', results = []
    while (status === 'Running' || status === 'Scheduled') {
      await new Promise(r => setTimeout(r, 2000))
      const resp = await cwLogsClient.send(new GetQueryResultsCommand({ queryId }))
      status = resp.status; results = resp.results || []
    }
    ok(res, results.map(r => { const obj = {}; r.forEach(f => { obj[f.field.replace('@', '')] = f.value }); return obj }))
  } catch (e) { err(res, e.message) }
})

module.exports = router
