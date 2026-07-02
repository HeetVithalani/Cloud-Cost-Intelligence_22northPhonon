const { ddbClient, PutCommand } = require('../config/awsClients')
const { v4: uuidv4 } = require('uuid')
const { logger } = require('./logger')

/**
 * Log a user action to the cloudsense-activity-logs DynamoDB table.
 * Fire-and-forget — never throws so it can't break request flow.
 */
async function logActivity({ userId = 'system', email = '', action, page = '', ip = '', meta = {} } = {}) {
  try {
    await ddbClient.send(new PutCommand({
      TableName: 'cloudsense-activity-logs',
      Item: {
        LogID: uuidv4(),
        Timestamp: new Date().toISOString(),
        userId,
        email,
        action,
        page,
        ip: ip || 'unknown',
        ...meta,
        // Keep logs for 90 days then DynamoDB auto-deletes via TTL
        ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 3600,
      },
    }))
  } catch (e) {
    // Never propagate — logging must not break the main request
    logger.error('Activity log write failed', { error: e.message })
  }
}

module.exports = { logActivity }
