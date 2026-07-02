const router = require('express').Router()
const { v4: uuidv4 } = require('uuid')
const { ddbClient, ScanCommand, UpdateCommand, PutCommand, GetCommand, QueryCommand } = require('../config/awsClients')
const { cwClient, snsClient, sesClient, PutMetricAlarmCommand, PublishCommand, SendEmailCommand } = require('../config/awsClients')
const { TABLES } = require('../config/constants')
const { authMiddleware, requireAdmin } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')
const { logger } = require('../helpers/logger')

// ── Alert severity validation ─────────────────────────────────
const VALID_SEVERITIES = ['critical', 'warning', 'info', 'acknowledged']

// ── List alerts ────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const severityFilter = req.query.severity
    if (severityFilter && severityFilter !== 'all' && !VALID_SEVERITIES.includes(severityFilter)) {
      return err(res, 'Invalid severity filter', 400)
    }
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.alerts }))
    let alerts = (Items || []).sort((a, b) => new Date(b.Timestamp || b.timestamp) - new Date(a.Timestamp || a.timestamp))
    if (severityFilter && severityFilter !== 'all') alerts = alerts.filter(a => a.severity === severityFilter)
    ok(res, alerts.map(a => ({ alertId: a.AlertID, resource: a.resource, message: a.message, severity: a.severity, status: a.status, timestamp: a.Timestamp || a.timestamp, suggestedAction: a.suggestedAction, type: a.type || 'system' })))
  } catch (e) { err(res, e.message) }
})

// ── Acknowledge alert ──────────────────────────────────────────
// FIX: Scan to find the alert by AlertID (HASH key), then update using its actual Timestamp (RANGE key)
router.post('/acknowledge/:alertId', authMiddleware, async (req, res) => {
  try {
    const alertId = req.params.alertId

    // Find the alert first to get its actual Timestamp (RANGE key)
    const { Items } = await ddbClient.send(new ScanCommand({
      TableName: TABLES.alerts,
      FilterExpression: 'AlertID = :id',
      ExpressionAttributeValues: { ':id': alertId },
      Limit: 1,
    }))

    if (!Items || Items.length === 0) return err(res, 'Alert not found', 404)

    const alert = Items[0]
    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.alerts,
      Key: { AlertID: alert.AlertID, Timestamp: alert.Timestamp },
      UpdateExpression: 'SET #s = :s, acknowledgedAt = :ack, acknowledgedBy = :by',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s': 'acknowledged',
        ':ack': new Date().toISOString(),
        ':by': req.user?.email || 'unknown',
      },
    }))
    ok(res, { acknowledged: true })
  } catch (e) { err(res, e.message) }
})

// ── Mark alert as read ────────────────────────────────────────
router.patch('/:alertId/read', authMiddleware, async (req, res) => {
  try {
    const alertId = req.params.alertId
    const { Items } = await ddbClient.send(new ScanCommand({
      TableName: TABLES.alerts,
      FilterExpression: 'AlertID = :id',
      ExpressionAttributeValues: { ':id': alertId },
      Limit: 1,
    }))
    if (!Items || Items.length === 0) return err(res, 'Alert not found', 404)
    const alert = Items[0]
    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.alerts,
      Key: { AlertID: alert.AlertID, Timestamp: alert.Timestamp },
      UpdateExpression: 'SET #s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'read' },
    }))
    ok(res, { read: true })
  } catch (e) { err(res, e.message) }
})

// ── Delete alert ──────────────────────────────────────────────
router.delete('/:alertId', authMiddleware, async (req, res) => {
  try {
    const alertId = req.params.alertId
    const { Items } = await ddbClient.send(new ScanCommand({
      TableName: TABLES.alerts,
      FilterExpression: 'AlertID = :id',
      ExpressionAttributeValues: { ':id': alertId },
      Limit: 1,
    }))
    if (!Items || Items.length === 0) return err(res, 'Alert not found', 404)
    const alert = Items[0]
    const { DeleteCommand } = require('@aws-sdk/lib-dynamodb')
    const deleteCmd = new DeleteCommand({
      TableName: TABLES.alerts,
      Key: { AlertID: alert.AlertID, Timestamp: alert.Timestamp },
    })
    await ddbClient.send(deleteCmd)
    ok(res, { deleted: true })
  } catch (e) { err(res, e.message) }
})

// ── Mark all alerts as read ───────────────────────────────────
router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const { Items } = await ddbClient.send(new ScanCommand({
      TableName: TABLES.alerts,
      FilterExpression: '#s <> :ack AND #s <> :rd',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':ack': 'acknowledged', ':rd': 'read' },
    }))
    let updated = 0
    for (const alert of (Items || [])) {
      await ddbClient.send(new UpdateCommand({
        TableName: TABLES.alerts,
        Key: { AlertID: alert.AlertID, Timestamp: alert.Timestamp },
        UpdateExpression: 'SET #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'read' },
      }))
      updated++
    }
    ok(res, { updated })
  } catch (e) { err(res, e.message) }
})

// ── Create alert rule (Admin only) ────────────────────────────
router.post('/rules', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { resourceId, metric, threshold, operator, severity, notifyEmail, notifySlack } = req.body
    const validOperators = ['>', '<', '>=', '<=']
    const validSeverities = ['critical', 'warning', 'info']
    if (!metric || typeof metric !== 'string' || metric.length > 256) return err(res, 'Invalid metric name', 400)
    if (!validOperators.includes(operator)) return err(res, 'Invalid operator', 400)
    if (!validSeverities.includes(severity)) return err(res, 'Invalid severity', 400)
    const thresholdNum = parseFloat(threshold)
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 1000000) return err(res, 'Invalid threshold', 400)
    const ruleId = uuidv4()
    const compOps = { '>': 'GreaterThanThreshold', '<': 'LessThanThreshold', '>=': 'GreaterThanOrEqualToThreshold', '<=': 'LessThanOrEqualToThreshold' }
    await cwClient.send(new PutMetricAlarmCommand({ AlarmName: `cloudsense-${ruleId}`, ComparisonOperator: compOps[operator], EvaluationPeriods: 1, MetricName: metric, Namespace: 'AWS/EC2', Period: 300, Statistic: 'Average', Threshold: thresholdNum, ActionsEnabled: true, AlarmActions: process.env.SNS_ALERT_TOPIC_ARN ? [process.env.SNS_ALERT_TOPIC_ARN] : [] }))
    await ddbClient.send(new PutCommand({ TableName: TABLES.alertRules, Item: { RuleID: ruleId, resourceId, metric, threshold: thresholdNum, operator, severity, notifyEmail, notifySlack, createdAt: new Date().toISOString() } }))
    ok(res, { ruleId })
  } catch (e) { err(res, e.message) }
})

// ── Save notification settings (Admin only) ───────────────────
router.post('/settings', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { slackWebhook, ...rest } = req.body
    if (slackWebhook) {
      try {
        const webhookUrl = new URL(slackWebhook)
        if (webhookUrl.hostname !== 'hooks.slack.com') return err(res, 'Invalid webhook URL: only hooks.slack.com is allowed', 400)
      } catch { return err(res, 'Invalid webhook URL format', 400) }
    }
    await ddbClient.send(new PutCommand({ TableName: TABLES.settings, Item: { SettingKey: 'notifications', ...rest, slackWebhook, updatedAt: new Date().toISOString() } }))
    ok(res, { saved: true })
  } catch (e) { err(res, e.message) }
})

// ── Test notification channels (Admin only) ───────────────────
router.post('/test', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { Item } = await ddbClient.send(new GetCommand({ TableName: TABLES.settings, Key: { SettingKey: 'notifications' } }))
    const results = { email: false, sns: false, slack: false }

    // Test SES email
    if (Item?.email && process.env.SES_FROM_EMAIL) {
      try {
        await sesClient.send(new SendEmailCommand({
          Source: `CloudSense <${process.env.SES_FROM_EMAIL}>`,
          Destination: { ToAddresses: [Item.email] },
          Message: {
            Subject: { Data: 'CloudSense — Test Alert Notification' },
            Body: {
              Html: { Data: '<div style="font-family:system-ui;max-width:480px;margin:auto;background:#080C14;color:#E8F0FE;border-radius:12px;padding:32px"><h2 style="color:#6366F1">🔔 Test Alert</h2><p style="color:#94A3B8">This is a test notification from CloudSense. If you received this, email alerts are working correctly.</p></div>' },
              Text: { Data: 'CloudSense Test Alert — Email alerts are working correctly.' },
            },
          },
        }))
        results.email = true
      } catch (sesErr) {
        logger.error('SES test failed', { error: sesErr.message })
      }
    }

    // Test SNS
    if (process.env.SNS_ALERT_TOPIC_ARN) {
      try {
        await snsClient.send(new PublishCommand({ TopicArn: process.env.SNS_ALERT_TOPIC_ARN, Subject: 'CloudSense Test Alert', Message: 'This is a test alert from CloudSense.' }))
        results.sns = true
      } catch (snsErr) {
        logger.error('SNS test failed', { error: snsErr.message })
      }
    }

    // Test Slack
    if (Item?.slackWebhook) {
      const webhookUrl = new URL(Item.slackWebhook)
      if (webhookUrl.hostname !== 'hooks.slack.com') throw new Error('Invalid webhook host')
      const https = require('https')
      await new Promise((resolve, reject) => {
        const req = https.request({ hostname: webhookUrl.hostname, path: webhookUrl.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } }, r => resolve(r))
        req.on('error', reject); req.write(JSON.stringify({ text: '🔔 CloudSense Test Alert — Connection successful!' })); req.end()
      })
      results.slack = true
    }

    ok(res, results)
  } catch (e) { err(res, e.message) }
})

// ── Trigger alert (internal use — called by evaluation engine) ─
async function createAlert({ resource, message, severity, type, suggestedAction }) {
  const alertId = uuidv4()
  const timestamp = new Date().toISOString()

  // 1. Save to DynamoDB
  await ddbClient.send(new PutCommand({
    TableName: TABLES.alerts,
    Item: {
      AlertID: alertId,
      Timestamp: timestamp,
      resource,
      message,
      severity,
      type: type || 'system',
      status: 'active',
      suggestedAction: suggestedAction || '',
    },
  }))

  // 2. Send SES email notification
  const { Item: settings } = await ddbClient.send(new GetCommand({ TableName: TABLES.settings, Key: { SettingKey: 'notifications' } })).catch(() => ({ Item: null }))

  if (settings?.email && process.env.SES_FROM_EMAIL) {
    const severityColors = { critical: '#FF3B5C', warning: '#FFB800', info: '#6366F1' }
    try {
      await sesClient.send(new SendEmailCommand({
        Source: `CloudSense Alerts <${process.env.SES_FROM_EMAIL}>`,
        Destination: { ToAddresses: [settings.email] },
        Message: {
          Subject: { Data: `[${severity.toUpperCase()}] CloudSense Alert: ${message.slice(0, 80)}` },
          Body: {
            Html: {
              Data: `<div style="font-family:system-ui;max-width:520px;margin:auto;background:#080C14;color:#E8F0FE;border-radius:12px;padding:32px">
                <h2 style="color:${severityColors[severity] || '#6366F1'}">⚠️ ${severity.toUpperCase()} Alert</h2>
                <p style="color:#94A3B8"><strong>Resource:</strong> ${resource}</p>
                <p style="color:#E8F0FE">${message}</p>
                ${suggestedAction ? `<p style="color:#10B981"><strong>Suggested Action:</strong> ${suggestedAction}</p>` : ''}
                <hr style="border-color:#1E293B"/>
                <p style="color:#64748B;font-size:12px">Alert ID: ${alertId} | ${timestamp}</p>
              </div>`,
            },
            Text: { Data: `[${severity.toUpperCase()}] ${message}\nResource: ${resource}\n${suggestedAction ? `Action: ${suggestedAction}` : ''}` },
          },
        },
      }))
      logger.info('Alert email sent', { alertId, to: settings.email })
    } catch (sesErr) {
      logger.error('Alert email failed', { error: sesErr.message, alertId })
    }
  }

  // 3. Publish to SNS
  if (process.env.SNS_ALERT_TOPIC_ARN) {
    try {
      await snsClient.send(new PublishCommand({
        TopicArn: process.env.SNS_ALERT_TOPIC_ARN,
        Subject: `CloudSense [${severity.toUpperCase()}]: ${message.slice(0, 80)}`,
        Message: JSON.stringify({ alertId, resource, message, severity, type, suggestedAction, timestamp }),
      }))
    } catch (snsErr) {
      logger.error('Alert SNS publish failed', { error: snsErr.message, alertId })
    }
  }

  return { alertId, timestamp }
}

// ── POST /evaluate — Manually trigger alert evaluation (Admin) ─
router.post('/evaluate', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { Items: rules } = await ddbClient.send(new ScanCommand({ TableName: TABLES.alertRules }))
    if (!rules || rules.length === 0) return ok(res, { evaluated: 0, triggered: 0 })

    let triggered = 0
    for (const rule of rules) {
      // Evaluate cost threshold rules
      if (rule.metric === 'monthly-cost') {
        try {
          const { getCostSummary } = require('../services/costService')
          const costs = await getCostSummary('thisMonth')
          const currentValue = costs.mtd || 0
          const threshold = parseFloat(rule.threshold)
          const ops = { '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b }
          const evaluate = ops[rule.operator] || ops['>']

          if (evaluate(currentValue, threshold)) {
            await createAlert({
              resource: 'AWS Cost Explorer',
              message: `Monthly cost ($${currentValue.toFixed(2)}) ${rule.operator} threshold ($${threshold.toFixed(2)})`,
              severity: rule.severity || 'warning',
              type: 'cost_threshold',
              suggestedAction: 'Review Cost Explorer for unexpected charges. Consider rightsizing resources or purchasing reserved instances.',
            })
            triggered++
          }
        } catch (costErr) {
          logger.error('Cost evaluation failed', { ruleId: rule.RuleID, error: costErr.message })
        }
      }

      // Evaluate cost spike rules
      if (rule.metric === 'cost-spike') {
        try {
          const { getCostSummary } = require('../services/costService')
          const costs = await getCostSummary('thisMonth')
          const changePercent = Math.abs(costs.changePercent || 0)
          const spikeThreshold = parseFloat(rule.threshold) || 20

          if (changePercent > spikeThreshold && costs.changeDir === 'up') {
            await createAlert({
              resource: 'AWS Cost Explorer',
              message: `Unusual cost spike detected: ${changePercent}% increase over last month (threshold: ${spikeThreshold}%)`,
              severity: rule.severity || 'warning',
              type: 'cost_spike',
              suggestedAction: `Investigate ${costs.biggestDriver || 'top services'} for unexpected usage increases.`,
            })
            triggered++
          }
        } catch (spikeErr) {
          logger.error('Spike evaluation failed', { ruleId: rule.RuleID, error: spikeErr.message })
        }
      }
    }

    ok(res, { evaluated: rules.length, triggered })
  } catch (e) {
    logger.error('Alert evaluation error', { error: e.message })
    err(res, e.message)
  }
})

module.exports = router
module.exports.createAlert = createAlert
