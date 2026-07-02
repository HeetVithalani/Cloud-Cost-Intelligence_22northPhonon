const TABLES = {
  users: 'cloudsense-users',
  metrics: 'cloudsense-metrics',
  costs: 'cloudsense-costs',
  alerts: 'cloudsense-alerts',
  alertRules: 'cloudsense-alerts-rules',
  cache: 'cloudsense-cache',
  settings: 'cloudsense-settings',
  reports: 'cloudsense-reports',
}

const IS_PROD = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET

if (IS_PROD && (!JWT_SECRET || JWT_SECRET === 'cloudsense-dev-secret-change-me')) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET must be set to a secure value in production!')
  process.exit(1)
}

const FINAL_JWT_SECRET = JWT_SECRET || 'cloudsense-dev-secret-change-me'
const CACHE_TTL = parseInt(process.env.COST_EXPLORER_CACHE_TTL || '21600')
const PORT = process.env.PORT || 3001

module.exports = { TABLES, IS_PROD, FINAL_JWT_SECRET, CACHE_TTL, PORT }
