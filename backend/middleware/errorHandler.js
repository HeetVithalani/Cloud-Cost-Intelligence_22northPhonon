const { logger } = require('../helpers/logger')

// WHY this is needed on AWS but not locally:
// Locally, unhandled errors crash the server but nodemon auto-restarts.
// On AWS (EC2/ECS/Elastic Beanstalk), an unhandled error = 502 Bad Gateway
// with NO JSON response, and the load balancer returns an HTML error page.

// Express async error wrapper — catches promise rejections in route handlers
// Without this, any unhandled `await` rejection bypasses Express error handling
// and causes the process to emit an unhandledRejection warning (or crash in Node 15+).
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 404 handler — must be registered AFTER all routes
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 404,
    path: req.originalUrl,
  })
}

// Global error handler — must be registered LAST (4 args signature is required by Express)
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(error, req, res, _next) {
  // Determine status code
  const statusCode = error.statusCode || error.status || 500

  // Log the full error for CloudWatch (with stack trace)
  logger.error(error.message, {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.userId || 'anonymous',
    stack: error.stack,
    // AWS SDK errors include this
    awsRequestId: error.$metadata?.requestId,
    awsErrorCode: error.name,
  })

  // NEVER expose stack traces or internal details to the client in production
  const isProd = process.env.NODE_ENV === 'production'
  const clientMessage = isProd && statusCode === 500
    ? 'An internal server error occurred'
    : error.message

  // Prevent double-send if headers already sent (e.g. streaming response failed mid-way)
  if (res.headersSent) return

  res.status(statusCode).json({
    success: false,
    error: clientMessage,
    code: statusCode,
  })
}

module.exports = { asyncHandler, notFoundHandler, globalErrorHandler }
