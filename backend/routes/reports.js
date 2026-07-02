const router = require('express').Router()
const { v4: uuidv4 } = require('uuid')
const { lambdaClient, s3Client, ddbClient, InvokeCommand, GetObjectCommand, ScanCommand, PutCommand, getSignedUrl } = require('../config/awsClients')
const { TABLES } = require('../config/constants')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')
const { logger } = require('../helpers/logger')

// ── Inline report generator (fallback when Lambda not configured) ─
async function generateInlineReport(type, dateRange) {
  const { getCostSummary, getCostTrend } = require('../services/costService')
  const { getEC2Instances } = require('../services/ec2Service')
  const { getAdvisorChecks } = require('../services/advisorService')

  const report = {
    type,
    generatedAt: new Date().toISOString(),
    period: dateRange || { start: new Date(Date.now() - 30 * 86400000).toISOString(), end: new Date().toISOString() },
    sections: [],
  }

  if (type === 'cost' || type === 'optimization') {
    try {
      const costs = await getCostSummary('thisMonth')
      report.sections.push({
        title: 'Cost Summary',
        data: {
          monthToDate: costs.mtd,
          forecast: costs.forecast,
          dailyAverage: costs.dailyAvg,
          changePercent: costs.changePercent,
          changeDirection: costs.changeDir,
          biggestDriver: costs.biggestDriver,
        },
      })
      if (costs.byService?.length) {
        report.sections.push({
          title: 'Cost by Service',
          data: costs.byService.map(s => ({ service: s.service, mtd: s.mtd, dailyAvg: s.dailyAvg })),
        })
      }
    } catch (e) { report.sections.push({ title: 'Cost Summary', error: e.message }) }

    try {
      const trend = await getCostTrend(30)
      report.sections.push({ title: 'Cost Trend (30 Days)', data: trend })
    } catch (e) { report.sections.push({ title: 'Cost Trend', error: e.message }) }
  }

  if (type === 'health' || type === 'optimization') {
    try {
      const instances = await getEC2Instances({})
      const running = instances.filter(i => i.state === 'running').length
      const stopped = instances.filter(i => i.state === 'stopped').length
      const underutilized = instances.filter(i => i.cpu < 10 && i.state === 'running')

      report.sections.push({
        title: 'EC2 Resource Utilization',
        data: {
          total: instances.length,
          running,
          stopped,
          underutilizedCount: underutilized.length,
          underutilizedInstances: underutilized.map(i => ({
            id: i.instanceId,
            name: i.name,
            type: i.instanceType,
            cpu: i.cpu,
            costPerMonth: i.costPerMonth,
          })),
        },
      })
    } catch (e) { report.sections.push({ title: 'EC2 Overview', error: e.message }) }
  }

  if (type === 'optimization') {
    try {
      const advisor = await getAdvisorChecks()
      report.sections.push({
        title: 'Trusted Advisor Recommendations',
        data: {
          supportPlan: advisor.supportPlan,
          totalEstimatedSavings: advisor.totalEstimatedSavings || 0,
          checks: (advisor.checks || []).filter(c => c.status === 'warning' || c.status === 'error').map(c => ({
            name: c.name,
            category: c.category,
            status: c.status,
            flaggedResources: c.flaggedResources,
            estimatedSavings: c.estimatedSavings,
          })),
        },
      })
    } catch (e) { report.sections.push({ title: 'Trusted Advisor', error: e.message }) }
  }

  return report
}

// ── Convert report to CSV ──────────────────────────────────────
function reportToCSV(report) {
  const rows = [['Section', 'Key', 'Value']]

  for (const section of report.sections) {
    if (section.error) {
      rows.push([section.title, 'Error', section.error])
      continue
    }

    if (Array.isArray(section.data)) {
      // Array data (e.g., cost trend, by-service)
      if (section.data.length > 0) {
        const keys = Object.keys(section.data[0])
        rows.push([section.title, ...keys])
        for (const item of section.data) {
          rows.push(['', ...keys.map(k => String(item[k] ?? ''))])
        }
      }
    } else if (typeof section.data === 'object') {
      // Object data
      for (const [key, value] of Object.entries(section.data)) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          rows.push([section.title, key, JSON.stringify(value)])
        } else if (Array.isArray(value)) {
          rows.push([section.title, key, `${value.length} items`])
        } else {
          rows.push([section.title, key, String(value ?? '')])
        }
      }
    }
  }

  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

// ── Generate Report ────────────────────────────────────────────
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { type, dateRange, options } = req.body
    const validTypes = ['cost', 'health', 'iam', 'optimization']
    if (!validTypes.includes(type)) return err(res, 'Invalid report type', 400)
    const requestId = uuidv4()
    const reportName = `${type}-report-${new Date().toISOString().split('T')[0]}`

    // Path A: Lambda report generator (PDF)
    if (process.env.LAMBDA_REPORT_FUNCTION) {
      const resp = await lambdaClient.send(new InvokeCommand({ FunctionName: process.env.LAMBDA_REPORT_FUNCTION, Payload: JSON.stringify({ type, dateRange, options, requestId }) }))
      const result = JSON.parse(new TextDecoder().decode(resp.Payload))
      if (result.errorMessage) throw new Error(result.errorMessage)
      const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: process.env.REPORTS_S3_BUCKET, Key: result.s3Key }), { expiresIn: 3600 })
      await ddbClient.send(new PutCommand({ TableName: TABLES.reports, Item: { ReportID: requestId, Timestamp: new Date().toISOString(), name: reportName, type, format: 'pdf', downloadUrl, s3Key: result.s3Key, size: result.size, generatedBy: req.user.email, status: 'complete' } }))
      ok(res, { downloadUrl, reportId: requestId, format: 'pdf' })
    }
    // Path B: Inline report generation (JSON + CSV)
    else {
      logger.info('Generating inline report', { type, user: req.user.email })
      const report = await generateInlineReport(type, dateRange)
      const csv = reportToCSV(report)

      await ddbClient.send(new PutCommand({
        TableName: TABLES.reports,
        Item: {
          ReportID: requestId,
          Timestamp: new Date().toISOString(),
          name: reportName,
          type,
          format: 'json',
          generatedBy: req.user.email,
          status: 'complete',
          reportData: JSON.stringify(report),
          csvData: csv,
          size: Buffer.byteLength(JSON.stringify(report)),
        },
      }))

      ok(res, { reportId: requestId, format: 'json', report })
    }
  } catch (e) {
    logger.error('Report generation error', { error: e.message })
    err(res, e.message)
  }
})

// ── List Reports ───────────────────────────────────────────────
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.reports }))
    const reports = (Items || []).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)).map(r => ({
      id: r.ReportID,
      name: r.name,
      type: r.type,
      format: r.format || 'pdf',
      generatedAt: r.Timestamp,
      size: r.size || 0,
      downloadUrl: r.downloadUrl || null,
      generatedBy: r.generatedBy,
      status: r.status || 'complete',
    }))
    ok(res, reports)
  } catch (e) { err(res, e.message) }
})

// ── Download Report (inline JSON/CSV) ──────────────────────────
router.get('/download/:reportId', authMiddleware, async (req, res) => {
  try {
    const reportId = req.params.reportId
    if (!reportId || !/^[a-zA-Z0-9-]+$/.test(reportId)) return err(res, 'Invalid report ID', 400)

    // Scan to find the report
    const { Items } = await ddbClient.send(new ScanCommand({
      TableName: TABLES.reports,
      FilterExpression: 'ReportID = :id',
      ExpressionAttributeValues: { ':id': reportId },
      Limit: 1,
    }))

    if (!Items || Items.length === 0) return err(res, 'Report not found', 404)
    const report = Items[0]

    const format = req.query.format || 'json'

    if (format === 'csv' && report.csvData) {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${report.name || 'report'}.csv"`)
      return res.send(report.csvData)
    }

    if (report.reportData) {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${report.name || 'report'}.json"`)
      return res.send(report.reportData)
    }

    // If it has a downloadUrl (Lambda-generated PDF), redirect
    if (report.downloadUrl) {
      return res.redirect(report.downloadUrl)
    }

    err(res, 'Report data not available for download', 404)
  } catch (e) {
    logger.error('Report download error', { error: e.message })
    err(res, e.message)
  }
})

module.exports = router
