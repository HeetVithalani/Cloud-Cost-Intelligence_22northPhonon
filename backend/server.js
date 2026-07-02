require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')

const { PORT } = require('./config/constants')
const { globalLimiter } = require('./middleware/auth')
const { ensureTables, seedAdmin } = require('./helpers/dynamo')
const { ok } = require('./helpers/response')
const { authMiddleware } = require('./middleware/auth')
const { logger } = require('./helpers/logger')
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler')

// ── Route Imports ──────────────────────────────────────────────
const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const dashboardRoutes = require('./routes/dashboard')
const resourceRoutes = require('./routes/resources')
const iamRoutes = require('./routes/iam')
const costRoutes = require('./routes/costs')
const cloudwatchRoutes = require('./routes/cloudwatch')
const advisorRoutes = require('./routes/advisor')
const alertRoutes = require('./routes/alerts')
const reportRoutes = require('./routes/reports')
const sampleDataRoutes = require('./routes/sampleData')
const costingRoutes = require('./routes/costing')

// ── App Setup ──────────────────────────────────────────────────
const app = express()

app.use(helmet())
app.use(cookieParser())

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    logger.warn('CORS blocked request', { origin })
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

app.use(express.json({ limit: '50kb' }))

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info('request', { method: req.method, url: req.originalUrl, status: res.statusCode, duration: Date.now() - start, ip: req.ip })
  })
  next()
})

app.use(globalLimiter)

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/iam', iamRoutes)
app.use('/api/costs', costRoutes)
app.use('/api/cloudwatch', cloudwatchRoutes)
app.use('/api/advisor', advisorRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/sample-data', sampleDataRoutes)
app.use('/api/costing', costingRoutes)

// Health check — unauthenticated for ALB/ECS probes
app.get('/api/health', (req, res) => ok(res, { status: 'ok' }))

// Error handling — must be AFTER all routes
app.use(notFoundHandler)
app.use(globalErrorHandler)

// ── Server Start ───────────────────────────────────────────────
let server
async function start() {
  logger.info('CloudSense Backend Starting...')
  try {
    await ensureTables()
    await seedAdmin()
    logger.info('DynamoDB ready')
  } catch (e) {
    logger.error('DynamoDB init error — server will still start', { error: e.message })
  }
  server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { region: process.env.AWS_REGION || 'us-east-1' })
  })
  server.keepAliveTimeout = 65000
  server.headersTimeout = 66000
}

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`)
  if (server) {
    server.close(() => { logger.info('HTTP server closed'); process.exit(0) })
    setTimeout(() => { logger.error('Forced shutdown'); process.exit(1) }, 10000)
  } else { process.exit(0) }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => { logger.error('Unhandled Promise Rejection', { error: reason?.message || String(reason) }) })
process.on('uncaughtException', (error) => { logger.error('Uncaught Exception', { error: error.message, stack: error.stack }); setTimeout(() => process.exit(1), 1000) })

start()
