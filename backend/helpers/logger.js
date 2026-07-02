// CloudWatch-compatible structured JSON logger
// WHY: CloudWatch Logs Insights can query JSON fields directly.
// console.log('text') creates unstructured logs that are unsearchable.

const IS_PROD = process.env.NODE_ENV === 'production'

function formatLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'cloudsense-backend',
    ...meta,
  }
  // In production, output single-line JSON (CloudWatch parses one JSON per line)
  // In dev, output human-readable format
  if (IS_PROD) {
    return JSON.stringify(entry)
  }
  const color = { ERROR: '\x1b[31m', WARN: '\x1b[33m', INFO: '\x1b[36m', DEBUG: '\x1b[90m' }[level] || ''
  return `${color}[${entry.timestamp}] ${level}\x1b[0m ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`
}

const logger = {
  info: (msg, meta) => console.log(formatLog('INFO', msg, meta)),
  warn: (msg, meta) => console.warn(formatLog('WARN', msg, meta)),
  error: (msg, meta) => console.error(formatLog('ERROR', msg, meta)),
  debug: (msg, meta) => { if (!IS_PROD) console.debug(formatLog('DEBUG', msg, meta)) },
}

module.exports = { logger }
