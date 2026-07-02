const router = require('express').Router()
const { getEC2Instances, getEC2Detail } = require('../services/ec2Service')
const { getS3Buckets } = require('../services/s3Service')
const { getRDSInstances } = require('../services/rdsService')
const { getLambdaFunctions } = require('../services/lambdaService')
const { getAlarms, getMetricData } = require('../services/cloudwatchService')
const { getCostSummary, getCostTrend } = require('../services/costService')
const { getCache, setCache } = require('../helpers/cache')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const cached = await getCache('dashboard-summary')
    if (cached) return ok(res, cached)
    const [ec2, s3, rds, lambda, alarms, costs, trend] = await Promise.allSettled([
      getEC2Instances({}), getS3Buckets(), getRDSInstances(), getLambdaFunctions(), getAlarms(), getCostSummary('thisMonth'), getCostTrend(30)
    ])
    const ec2Data = ec2.status === 'fulfilled' ? ec2.value : []
    const s3Data = s3.status === 'fulfilled' ? s3.value : []
    const rdsData = rds.status === 'fulfilled' ? rds.value : []
    const lambdaData = lambda.status === 'fulfilled' ? lambda.value : []
    const alarmsData = alarms.status === 'fulfilled' ? alarms.value : []
    const costsData = costs.status === 'fulfilled' ? costs.value : {}
    const trendData = trend.status === 'fulfilled' ? trend.value : []
    const activeAlarms = alarmsData.filter(a => a.stateValue === 'alarm')
    const healthy = (arr, key = 'state') => arr.filter(i => ['running', 'available', 'active'].includes(i[key]?.toLowerCase())).length
    const summary = {
      totalResources: ec2Data.length + s3Data.length + rdsData.length + lambdaData.length,
      ec2Count: ec2Data.length, s3Count: s3Data.length, rdsCount: rdsData.length, lambdaCount: lambdaData.length,
      mtdCost: costsData.mtd || 0, forecast: costsData.forecast || 0,
      costChange: costsData.changePercent ? `${Math.abs(costsData.changePercent)}%` : '0%', costChangeDir: costsData.changeDir || 'down',
      activeAlerts: activeAlarms.length, criticalAlerts: activeAlarms.filter(a => a.stateValue === 'alarm').length, warningAlerts: 0,
      healthScore: Math.round(((healthy(ec2Data) + s3Data.length + healthy(rdsData, 'status') + lambdaData.length) / Math.max(ec2Data.length + s3Data.length + rdsData.length + lambdaData.length, 1)) * 100),
      costTrend: trendData, costByService: costsData.byService?.slice(0, 6).map(s => ({ name: s.service, value: s.mtd })) || [],
      serviceHealth: [
        { name: 'EC2', total: ec2Data.length, healthy: healthy(ec2Data), warning: ec2Data.filter(i => i.state === 'pending').length, critical: ec2Data.filter(i => i.state === 'stopped').length },
        { name: 'S3', total: s3Data.length, healthy: s3Data.length, warning: 0, critical: s3Data.filter(b => b.publicAccess).length },
        { name: 'RDS', total: rdsData.length, healthy: healthy(rdsData, 'status'), warning: 0, critical: rdsData.filter(d => d.status !== 'available').length },
        { name: 'Lambda', total: lambdaData.length, healthy: lambdaData.length, warning: lambdaData.filter(f => f.errorRate > 1).length, critical: lambdaData.filter(f => f.errorRate > 5).length },
      ],
      recentAlerts: activeAlarms.slice(0, 5).map(a => ({ resource: a.alarmName, message: `${a.metricName} ${a.comparisonOperator} ${a.threshold}`, severity: 'critical', timestamp: a.stateUpdatedTimestamp }))
    }
    await setCache('dashboard-summary', summary, 300)
    ok(res, summary)
  } catch (e) { err(res, e.message) }
})

module.exports = router
