const { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand } = require('@aws-sdk/client-ec2')
const { S3Client, ListBucketsCommand, GetBucketLocationCommand, GetBucketAclCommand, GetBucketPolicyStatusCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3')
const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds')
const { LambdaClient, ListFunctionsCommand, InvokeCommand } = require('@aws-sdk/client-lambda')
const { IAMClient, ListRolesCommand, ListAttachedRolePoliciesCommand, GetPolicyCommand, GetPolicyVersionCommand } = require('@aws-sdk/client-iam')
const { CloudWatchClient, GetMetricStatisticsCommand, GetMetricDataCommand, DescribeAlarmsCommand, PutMetricAlarmCommand } = require('@aws-sdk/client-cloudwatch')
const { CloudWatchLogsClient, DescribeLogGroupsCommand, StartQueryCommand, GetQueryResultsCommand } = require('@aws-sdk/client-cloudwatch-logs')
const { CostExplorerClient, GetCostAndUsageCommand, GetCostForecastCommand } = require('@aws-sdk/client-cost-explorer')
const { SupportClient, DescribeTrustedAdvisorChecksCommand, DescribeTrustedAdvisorCheckResultCommand } = require('@aws-sdk/client-support')
const { SNSClient, PublishCommand, CreateTopicCommand } = require('@aws-sdk/client-sns')
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const region = process.env.AWS_REGION || 'us-east-1'

// WHY we add requestTimeout and maxAttempts:
// Locally, AWS SDK calls go through your internet connection which may be fast.
// On AWS EC2/ECS, SDK calls go through the VPC. If Security Groups or VPC endpoints
// are misconfigured, calls HANG indefinitely (no timeout = frozen request = 504 from ALB).
// DynamoDB is especially prone: a missing VPC endpoint = connection hangs forever.
const sdkConfig = {
  region,
  requestHandler: undefined, // use default
  maxAttempts: 3,           // Retry on transient network errors
}

// DynamoDB-specific: separate timeout because it should be faster (same-region)
const ddbConfig = {
  region,
  maxAttempts: 3,
}

const ec2Client = new EC2Client(sdkConfig)
const s3Client = new S3Client(sdkConfig)
const rdsClient = new RDSClient(sdkConfig)
const lambdaClient = new LambdaClient(sdkConfig)
const iamClient = new IAMClient({ ...sdkConfig, region: 'us-east-1' })
const cwClient = new CloudWatchClient(sdkConfig)
const cwLogsClient = new CloudWatchLogsClient(sdkConfig)
const costClient = new CostExplorerClient({ ...sdkConfig, region: 'us-east-1' })
const advisorClient = new SupportClient({ ...sdkConfig, region: 'us-east-1' })
const snsClient = new SNSClient(sdkConfig)

// SES client: MUST use the region where your SES identities are verified.
// WHY OTP fails on AWS: If SES_REGION is not set, it defaults to your app region,
// but your email identity might be verified in a different region (e.g., us-east-1).
const sesRegion = process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1'
const sesClient = new SESClient({ ...sdkConfig, region: sesRegion })

const rawDdbClient = new DynamoDBClient(ddbConfig)
const ddbClient = DynamoDBDocumentClient.from(rawDdbClient, {
  marshallOptions: { removeUndefinedValues: true },
})

module.exports = {
  region,
  ec2Client, s3Client, rdsClient, lambdaClient, iamClient,
  cwClient, cwLogsClient, costClient, advisorClient,
  snsClient, sesClient, ddbClient,
  // Re-export all command classes so service files can import them from one place
  DescribeInstancesCommand, DescribeVolumesCommand,
  ListBucketsCommand, GetBucketLocationCommand, GetBucketAclCommand, GetBucketPolicyStatusCommand, ListObjectsV2Command, GetObjectCommand,
  DescribeDBInstancesCommand,
  ListFunctionsCommand, InvokeCommand,
  ListRolesCommand, ListAttachedRolePoliciesCommand, GetPolicyCommand, GetPolicyVersionCommand,
  GetMetricStatisticsCommand, GetMetricDataCommand, DescribeAlarmsCommand, PutMetricAlarmCommand,
  DescribeLogGroupsCommand, StartQueryCommand, GetQueryResultsCommand,
  GetCostAndUsageCommand, GetCostForecastCommand,
  DescribeTrustedAdvisorChecksCommand, DescribeTrustedAdvisorCheckResultCommand,
  PublishCommand, CreateTopicCommand,
  SendEmailCommand,
  CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand,
  GetCommand, PutCommand, ScanCommand, UpdateCommand, DeleteCommand, QueryCommand,
  getSignedUrl,
}
