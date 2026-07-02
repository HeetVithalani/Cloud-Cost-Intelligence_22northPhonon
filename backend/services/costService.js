const { costClient, GetCostAndUsageCommand, GetCostForecastCommand } = require('../config/awsClients')
const { getCache, setCache } = require('../helpers/cache')

async function getCostSummary(period = 'thisMonth') {
  const cacheKey = `costs-${period}`
  const cached = await getCache(cacheKey)
  if (cached) return cached
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    let start, end
    if (period === 'lastMonth') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = startOfMonth }
    else if (period === 'last3Months') { start = new Date(now.getFullYear(), now.getMonth() - 3, 1); end = now }
    else { start = startOfMonth; end = now }
    const fmt = d => d.toISOString().split('T')[0]
    const { ResultsByTime } = await costClient.send(new GetCostAndUsageCommand({ TimePeriod: { Start: fmt(start), End: fmt(end) }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] }))
    let mtd = 0; const byService = {}
    for (const t of (ResultsByTime || [])) { for (const g of (t.Groups || [])) { const svc = g.Keys?.[0] || 'Other'; const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount || 0); mtd += amt; byService[svc] = (byService[svc] || 0) + amt } }
    let forecast = mtd
    try {
      const fcResp = await costClient.send(new GetCostForecastCommand({ TimePeriod: { Start: fmt(now), End: fmt(endOfMonth) }, Metric: 'UNBLENDED_COST', Granularity: 'MONTHLY' }))
      forecast = parseFloat(fcResp.Total?.Amount || mtd)
    } catch {}
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    let lastMtd = 0
    try {
      const lastResp = await costClient.send(new GetCostAndUsageCommand({ TimePeriod: { Start: fmt(lastStart), End: fmt(startOfMonth) }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'] }))
      lastMtd = parseFloat(lastResp.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || 0)
    } catch {}
    const changePercent = lastMtd > 0 ? Math.round(((mtd - lastMtd) / lastMtd) * 100) : 0
    const daysElapsed = Math.max(1, Math.ceil((now - startOfMonth) / 86400000))
    const svcArr = Object.entries(byService).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    const result = { mtd: Math.round(mtd * 100) / 100, forecast: Math.round(forecast * 100) / 100, dailyAvg: Math.round((mtd / daysElapsed) * 100) / 100, changePercent, changeDir: changePercent >= 0 ? 'up' : 'down', biggestDriver: svcArr[0]?.name || 'N/A', byService: svcArr.map(s => ({ service: s.name, mtd: s.value, dailyAvg: Math.round((s.value / daysElapsed) * 100) / 100, projected: Math.round((s.value / daysElapsed) * 30) * 100 / 100, change: '', changeDir: 'up' })) }
    await setCache(cacheKey, result)
    return result
  } catch (e) { throw new Error(`Cost Explorer error: ${e.message}`) }
}

async function getCostTrend(days = 30) {
  const cacheKey = `cost-trend-${days}`
  const cached = await getCache(cacheKey)
  if (cached) return cached
  try {
    const end = new Date(); const start = new Date(end - days * 86400000)
    const fmt = d => d.toISOString().split('T')[0]
    const { ResultsByTime } = await costClient.send(new GetCostAndUsageCommand({ TimePeriod: { Start: fmt(start), End: fmt(end) }, Granularity: 'DAILY', Metrics: ['UnblendedCost'] }))
    const result = (ResultsByTime || []).map(t => ({ date: t.TimePeriod?.Start, cost: parseFloat(t.Total?.UnblendedCost?.Amount || 0) }))
    await setCache(cacheKey, result)
    return result
  } catch (e) { throw new Error(`Cost trend error: ${e.message}`) }
}

module.exports = { getCostSummary, getCostTrend }
