const { ec2Client, cwClient, DescribeInstancesCommand, DescribeVolumesCommand, GetMetricStatisticsCommand } = require('../config/awsClients')
const { region } = require('../config/awsClients')

async function getEC2Instances(filters = {}) {
  try {
    const params = {}
    const awsFilters = []
    if (filters.status && filters.status !== 'all') awsFilters.push({ Name: 'instance-state-name', Values: [filters.status] })
    if (awsFilters.length) params.Filters = awsFilters
    const { Reservations } = await ec2Client.send(new DescribeInstancesCommand(params))
    const instances = []
    for (const r of (Reservations || [])) {
      for (const inst of (r.Instances || [])) {
        const nameTag = inst.Tags?.find(t => t.Key === 'Name')
        const iamProfile = inst.IamInstanceProfile?.Arn?.split('/')?.pop()
        let cpu = 0
        try {
          const cpuData = await cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/EC2', MetricName: 'CPUUtilization', Dimensions: [{ Name: 'InstanceId', Value: inst.InstanceId }], StartTime: new Date(Date.now() - 3600000), EndTime: new Date(), Period: 3600, Statistics: ['Average'] }))
          cpu = cpuData.Datapoints?.[0]?.Average || 0
        } catch {}
        const costMap = { 't2.micro': 8.35, 't2.small': 16.70, 't2.medium': 33.41, 't3.micro': 7.49, 't3.small': 14.98, 't3.medium': 29.95, 'm5.large': 69.12, 'm5.xlarge': 138.24 }
        instances.push({
          id: inst.InstanceId,
          instanceId: inst.InstanceId,
          name: nameTag?.Value || 'Unnamed',
          instanceType: inst.InstanceType,
          state: inst.State?.Name,
          region: inst.Placement?.AvailabilityZone?.slice(0, -1),
          cpu: Math.round(cpu * 100) / 100,
          costPerMonth: costMap[inst.InstanceType] || 25.00,
          launchTime: inst.LaunchTime,
          vpcId: inst.VpcId,
          subnetId: inst.SubnetId,
          iamRole: iamProfile,
        })
      }
    }
    if (filters.iamRole && filters.iamRole !== 'all') return instances.filter(i => i.iamRole === filters.iamRole)
    return instances
  } catch (e) { throw new Error(`EC2 error: ${e.message}`) }
}

async function getEC2Detail(instanceId) {
  try {
    const { Reservations } = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }))
    const inst = Reservations?.[0]?.Instances?.[0]
    if (!inst) throw new Error('Instance not found')
    const now = new Date(); const dayAgo = new Date(now - 86400000)
    const [cpuData, netIn, netOut] = await Promise.all([
      cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/EC2', MetricName: 'CPUUtilization', Dimensions: [{ Name: 'InstanceId', Value: instanceId }], StartTime: dayAgo, EndTime: now, Period: 3600, Statistics: ['Average'] })),
      cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/EC2', MetricName: 'NetworkIn', Dimensions: [{ Name: 'InstanceId', Value: instanceId }], StartTime: dayAgo, EndTime: now, Period: 3600, Statistics: ['Sum'] })),
      cwClient.send(new GetMetricStatisticsCommand({ Namespace: 'AWS/EC2', MetricName: 'NetworkOut', Dimensions: [{ Name: 'InstanceId', Value: instanceId }], StartTime: dayAgo, EndTime: now, Period: 3600, Statistics: ['Sum'] })),
    ])
    let volumes = []
    try {
      const v = await ec2Client.send(new DescribeVolumesCommand({ Filters: [{ Name: 'attachment.instance-id', Values: [instanceId] }] }))
      volumes = (v.Volumes || []).map(v => ({ volumeId: v.VolumeId, size: v.Size, type: v.VolumeType, state: v.State }))
    } catch {}
    return {
      instanceId,
      name: inst.Tags?.find(t => t.Key === 'Name')?.Value,
      instanceType: inst.InstanceType,
      state: inst.State?.Name,
      cpuHistory: (cpuData.Datapoints || []).sort((a, b) => a.Timestamp - b.Timestamp).map(d => ({ timestamp: d.Timestamp, value: d.Average })),
      networkIn: netIn.Datapoints?.reduce((s, d) => s + (d.Sum || 0), 0) || 0,
      networkOut: netOut.Datapoints?.reduce((s, d) => s + (d.Sum || 0), 0) || 0,
      volumes,
      iamRole: inst.IamInstanceProfile?.Arn?.split('/')?.pop(),
    }
  } catch (e) { throw new Error(`EC2 detail error: ${e.message}`) }
}

module.exports = { getEC2Instances, getEC2Detail }
