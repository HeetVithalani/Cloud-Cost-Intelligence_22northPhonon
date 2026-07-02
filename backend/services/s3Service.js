const { s3Client, ListBucketsCommand, GetBucketLocationCommand, GetBucketPolicyStatusCommand } = require('../config/awsClients')
const { region } = require('../config/awsClients')

async function getS3Buckets() {
  try {
    const { Buckets } = await s3Client.send(new ListBucketsCommand({}))
    const results = []
    for (const b of (Buckets || [])) {
      let bucketRegion = region, publicAccess = false
      try { const loc = await s3Client.send(new GetBucketLocationCommand({ Bucket: b.Name })); bucketRegion = loc.LocationConstraint || 'us-east-1' } catch {}
      try { const pol = await s3Client.send(new GetBucketPolicyStatusCommand({ Bucket: b.Name })); publicAccess = pol.PolicyStatus?.IsPublic || false } catch {}
      results.push({ id: b.Name, name: b.Name, region: bucketRegion, sizeGB: 0, objectCount: 0, publicAccess, creationDate: b.CreationDate, costPerMonth: 0.023 })
    }
    return results
  } catch (e) { throw new Error(`S3 error: ${e.message}`) }
}

module.exports = { getS3Buckets }
