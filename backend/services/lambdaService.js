const { lambdaClient, cwClient, ListFunctionsCommand, GetMetricStatisticsCommand } = require('../config/awsClients')

async function getLambdaFunctions() {
  try {
    const fns = []; let marker = undefined
    do {
      const resp = await lambdaClient.send(new ListFunctionsCommand({ Marker: marker, MaxItems: 50 }))
      fns.push(...(resp.Functions || []))
      marker = resp.NextMarker
    } while (marker)
    const results = []
    for (const fn of fns) {
      let invocations = 0, avgDuration = 0, errors = 0
      const now = new Date(); const weekAgo = new Date(now - 7 * 86400000)
      try {
        const [inv, dur, errs] = await Promise.all([
          cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/Lambda', MetricName: 'Invocations', Dimensions: [{ Name: 'FunctionName', Value: fn.FunctionName }], StartTime: weekAgo, EndTime: now, Period: 604800, Statistics: ['Sum'] })),
          cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/Lambda', MetricName: 'Duration', Dimensions: [{ Name: 'FunctionName', Value: fn.FunctionName }], StartTime: weekAgo, EndTime: now, Period: 604800, Statistics: ['Average'] })),
          cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/Lambda', MetricName: 'Errors', Dimensions: [{ Name: 'FunctionName', Value: fn.FunctionName }], StartTime: weekAgo, EndTime: now, Period: 604800, Statistics: ['Sum'] })),
        ])
        invocations = inv.Datapoints?.[0]?.Sum || 0
        avgDuration = dur.Datapoints?.[0]?.Average || 0
        errors = errs.Datapoints?.[0]?.Sum || 0
      } catch {}
      const errorRate = invocations > 0 ? (errors / invocations) * 100 : 0
      results.push({ id: fn.FunctionName, functionName: fn.FunctionName, runtime: fn.Runtime, memory: fn.MemorySize, invocations, avgDuration, errorRate: Math.round(errorRate * 100) / 100, costPerMonth: (invocations * 0.0000002) + (invocations * (avgDuration / 1000) * (fn.MemorySize / 1024) * 0.0000166667), role: fn.Role })
    }
    return results
  } catch (e) { throw new Error(`Lambda error: ${e.message}`) }
}

module.exports = { getLambdaFunctions }
