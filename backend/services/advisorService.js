const { advisorClient, DescribeTrustedAdvisorChecksCommand, DescribeTrustedAdvisorCheckResultCommand } = require('../config/awsClients')
const { getCache, setCache } = require('../helpers/cache')
const { logger } = require('../helpers/logger')

// ── Constants ──────────────────────────────────────────────────
const CACHE_KEY = 'trusted-advisor-checks'
const CACHE_TTL = 3600  // 1 hour — Trusted Advisor data changes slowly
const MAX_CHECKS = 25   // Limit to prevent excessive API calls
const RETRY_DELAY_MS = 1500

// ── Retry helper with exponential backoff ──────────────────────
async function withRetry(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      // Throttling — wait and retry
      if (e.name === 'Throttling' || e.name === 'TooManyRequestsException' || e.$metadata?.httpStatusCode === 429) {
        if (i < retries) {
          const wait = RETRY_DELAY_MS * Math.pow(2, i)
          logger.warn('Trusted Advisor throttled, retrying', { attempt: i + 1, waitMs: wait })
          await new Promise(r => setTimeout(r, wait))
          continue
        }
      }
      throw e
    }
  }
}

// ── Detect Basic Support plan ──────────────────────────────────
// Basic AWS accounts get "SubscriptionRequiredException" when calling
// Trusted Advisor APIs beyond the free checks.
function isBasicPlanError(e) {
  return e.name === 'SubscriptionRequiredException' ||
         e.message?.includes('subscription') ||
         e.message?.includes('AWS Support') ||
         e.$metadata?.httpStatusCode === 400
}

// ── Main function ──────────────────────────────────────────────
async function getAdvisorChecks() {
  // 1. Check cache first
  const cached = await getCache(CACHE_KEY)
  if (cached) return cached

  try {
    // 2. Fetch all available checks
    const { checks } = await withRetry(() =>
      advisorClient.send(new DescribeTrustedAdvisorChecksCommand({ language: 'en' }))
    )

    if (!checks || checks.length === 0) {
      const empty = { checks: [], supportPlan: 'unknown', message: 'No Trusted Advisor checks available.' }
      await setCache(CACHE_KEY, empty, CACHE_TTL)
      return empty
    }

    // 3. Fetch results for each check (limit to MAX_CHECKS)
    const results = []
    for (const check of checks.slice(0, MAX_CHECKS)) {
      try {
        const { result } = await withRetry(() =>
          advisorClient.send(new DescribeTrustedAdvisorCheckResultCommand({ checkId: check.id }))
        )

        results.push({
          id: check.id,
          name: check.name,
          category: check.category,
          description: check.description,
          status: result?.status || 'not_available',
          flaggedResources: result?.flaggedResources?.length || 0,
          resourcesSummary: result?.resourcesSummary || {},
          categorySpecificSummary: result?.categorySpecificSummary || {},
          estimatedSavings: parseFloat(
            result?.categorySpecificSummary?.costOptimizing?.estimatedMonthlySavings || 0
          ),
          timestamp: result?.timestamp || null,
        })

        // Small delay between calls to avoid throttling
        await new Promise(r => setTimeout(r, 200))
      } catch (innerErr) {
        // Individual check failed — still return it with error status
        logger.warn('Trusted Advisor check failed', { checkId: check.id, error: innerErr.message })
        results.push({
          id: check.id,
          name: check.name,
          category: check.category,
          description: check.description,
          status: innerErr.message?.includes('in progress') ? 'in_progress' : 'error',
          flaggedResources: 0,
          resourcesSummary: {},
          categorySpecificSummary: {},
          estimatedSavings: 0,
          timestamp: null,
          error: innerErr.message,
        })
      }
    }

    const response = {
      checks: results,
      supportPlan: 'business_or_enterprise',
      totalChecks: checks.length,
      fetchedChecks: results.length,
      totalEstimatedSavings: results.reduce((sum, r) => sum + r.estimatedSavings, 0),
    }

    await setCache(CACHE_KEY, response, CACHE_TTL)
    return response

  } catch (e) {
    // ── BASIC SUPPORT PLAN FALLBACK ───────────────────────────
    if (isBasicPlanError(e)) {
      logger.warn('Trusted Advisor: Basic Support plan detected — returning limited data')

      const fallback = {
        checks: [
          { id: 'basic-1', name: 'Service Limits', category: 'performance', description: 'Checks for service usage that is more than 80% of the service limit.', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
          { id: 'basic-2', name: 'Security Groups - Unrestricted Access', category: 'security', description: 'Checks security groups for rules that allow unrestricted access to a resource.', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
          { id: 'basic-3', name: 'IAM Use', category: 'security', description: 'Checks for your use of AWS Identity and Access Management (IAM).', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
          { id: 'basic-4', name: 'MFA on Root Account', category: 'security', description: 'Checks the root account and warns if multi-factor authentication (MFA) is not enabled.', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
          { id: 'basic-5', name: 'EBS Public Snapshots', category: 'security', description: 'Checks the permission settings for your Amazon Elastic Block Store (Amazon EBS) volume snapshots.', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
          { id: 'basic-6', name: 'RDS Public Snapshots', category: 'security', description: 'Checks the permission settings for your Amazon Relational Database Service (Amazon RDS) DB snapshots.', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
          { id: 'basic-7', name: 'S3 Bucket Permissions', category: 'security', description: 'Checks buckets in Amazon Simple Storage Service (Amazon S3) that have open access permissions.', status: 'not_available', flaggedResources: 0, estimatedSavings: 0 },
        ],
        supportPlan: 'basic',
        message: 'Your AWS account has a Basic Support plan. Full Trusted Advisor checks require a Business or Enterprise Support plan. Showing limited free-tier checks only.',
        upgradeUrl: 'https://console.aws.amazon.com/support/plans/home',
        totalEstimatedSavings: 0,
      }

      await setCache(CACHE_KEY, fallback, CACHE_TTL)
      return fallback
    }

    // ── Other errors ──────────────────────────────────────────
    logger.error('Trusted Advisor service error', { error: e.message, code: e.name })
    throw new Error(`Trusted Advisor error: ${e.message}`)
  }
}

module.exports = { getAdvisorChecks }
