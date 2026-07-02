const { rdsClient, cwClient, DescribeDBInstancesCommand, GetMetricStatisticsCommand } = require('../config/awsClients')

async function getRDSInstances() {
  try {
    const { DBInstances } = await rdsClient.send(new DescribeDBInstancesCommand({}))
    const results = []
    for (const db of (DBInstances || [])) {
      let cpu = 0, connections = 0
      try {
        const cpuData = await cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/RDS', MetricName: 'CPUUtilization', Dimensions: [{ Name: 'DBInstanceIdentifier', Value: db.DBInstanceIdentifier }], StartTime: new Date(Date.now() - 3600000), EndTime: new Date(), Period: 3600, Statistics: ['Average'] }))
        cpu = cpuData.Datapoints?.[0]?.Average || 0
      } catch {}
      try {
        const connData = await cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/RDS', MetricName: 'DatabaseConnections', Dimensions: [{ Name: 'DBInstanceIdentifier', Value: db.DBInstanceIdentifier }], StartTime: new Date(Date.now() - 3600000), EndTime: new Date(), Period: 3600, Statistics: ['Average'] }))
        connections = Math.round(connData.Datapoints?.[0]?.Average || 0)
      } catch {}
      const costMap = { 'db.t2.micro': 12.41, 'db.t3.micro': 11.86, 'db.t3.small': 23.72, 'db.m5.large': 124.10 }
      results.push({ id: db.DBInstanceIdentifier, identifier: db.DBInstanceIdentifier, engine: `${db.Engine} ${db.EngineVersion || ''}`.trim(), instanceClass: db.DBInstanceClass, status: db.DBInstanceStatus, storage: db.AllocatedStorage, connections, cpu: Math.round(cpu * 100) / 100, multiAZ: db.MultiAZ || false, costPerMonth: costMap[db.DBInstanceClass] || 30.00 })
    }
    return results
  } catch (e) { throw new Error(`RDS error: ${e.message}`) }
}

module.exports = { getRDSInstances }
