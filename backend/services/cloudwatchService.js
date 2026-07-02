const { cwClient, DescribeAlarmsCommand, GetMetricStatisticsCommand } = require('../config/awsClients')

async function getAlarms() {
  try {
    const { MetricAlarms } = await cwClient.send(new DescribeAlarmsCommand({}))
    return (MetricAlarms || []).map(a => ({
      alarmName: a.AlarmName,
      stateValue: a.StateValue?.toLowerCase(),
      namespace: a.Namespace,
      metricName: a.MetricName,
      threshold: a.Threshold,
      comparisonOperator: a.ComparisonOperator,
      dimensions: a.Dimensions,
      stateUpdatedTimestamp: a.StateUpdatedTimestamp,
      actionsEnabled: a.ActionsEnabled,
    }))
  } catch (e) { throw new Error(`CloudWatch error: ${e.message}`) }
}

async function getMetricData(namespace, metricName, resourceId, hours = 24) {
  try {
    const dims = []
    if (resourceId) {
      if (namespace === 'AWS/EC2') dims.push({ Name: 'InstanceId', Value: resourceId })
      else if (namespace === 'AWS/RDS') dims.push({ Name: 'DBInstanceIdentifier', Value: resourceId })
      else if (namespace === 'AWS/Lambda') dims.push({ Name: 'FunctionName', Value: resourceId })
    }
    const period = hours <= 1 ? 60 : hours <= 24 ? 300 : 3600
    const { Datapoints } = await cwClient.send(new GetMetricStatisticsCommand({ Namespace: namespace, MetricName: metricName, Dimensions: dims, StartTime: new Date(Date.now() - hours * 3600000), EndTime: new Date(), Period: period, Statistics: ['Average', 'Maximum'] }))
    return (Datapoints || []).sort((a, b) => a.Timestamp - b.Timestamp).map(d => ({ timestamp: d.Timestamp, value: d.Average }))
  } catch (e) { throw new Error(`Metric error: ${e.message}`) }
}

module.exports = { getAlarms, getMetricData }
