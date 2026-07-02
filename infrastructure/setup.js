const { DynamoDBClient, CreateTableCommand, DescribeTableCommand,
  UpdateTimeToLiveCommand } = require('@aws-sdk/client-dynamodb')
const { SNSClient, CreateTopicCommand } = require('@aws-sdk/client-sns')

const region = process.env.AWS_REGION || 'us-east-1'
const ddb = new DynamoDBClient({ region })
const sns = new SNSClient({ region })

const tables = [
  { TableName: 'cloudsense-users', KeySchema: [{ AttributeName: 'UserID', KeyType: 'HASH' }], AttributeDefinitions: [{ AttributeName: 'UserID', AttributeType: 'S' }] },
  { TableName: 'cloudsense-metrics', KeySchema: [{ AttributeName: 'ResourceID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }], AttributeDefinitions: [{ AttributeName: 'ResourceID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
  { TableName: 'cloudsense-costs', KeySchema: [{ AttributeName: 'CostID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }], AttributeDefinitions: [{ AttributeName: 'CostID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
  { TableName: 'cloudsense-alerts', KeySchema: [{ AttributeName: 'AlertID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }], AttributeDefinitions: [{ AttributeName: 'AlertID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
  { TableName: 'cloudsense-alerts-rules', KeySchema: [{ AttributeName: 'RuleID', KeyType: 'HASH' }], AttributeDefinitions: [{ AttributeName: 'RuleID', AttributeType: 'S' }] },
  { TableName: 'cloudsense-cache', KeySchema: [{ AttributeName: 'CacheKey', KeyType: 'HASH' }], AttributeDefinitions: [{ AttributeName: 'CacheKey', AttributeType: 'S' }] },
  { TableName: 'cloudsense-settings', KeySchema: [{ AttributeName: 'SettingKey', KeyType: 'HASH' }], AttributeDefinitions: [{ AttributeName: 'SettingKey', AttributeType: 'S' }] },
  { TableName: 'cloudsense-reports', KeySchema: [{ AttributeName: 'ReportID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }], AttributeDefinitions: [{ AttributeName: 'ReportID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
]

async function tableExists(name) {
  try {
    await ddb.send(new DescribeTableCommand({ TableName: name }))
    return true
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return false
    throw e
  }
}

async function createTables() {
  for (const t of tables) {
    const exists = await tableExists(t.TableName)
    if (exists) {
      console.log(`✓ Table ${t.TableName} already exists`)
      continue
    }
    await ddb.send(new CreateTableCommand({
      ...t,
      BillingMode: 'PAY_PER_REQUEST',
    }))
    console.log(`✓ Created table ${t.TableName}`)
  }

  // Enable TTL on cache table
  try {
    await ddb.send(new UpdateTimeToLiveCommand({
      TableName: 'cloudsense-cache',
      TimeToLiveSpecification: { Enabled: true, AttributeName: 'ttl' },
    }))
    console.log('✓ Enabled TTL on cloudsense-cache')
  } catch (e) {
    if (e.name === 'ValidationException' && e.message.includes('already enabled')) {
      console.log('✓ TTL already enabled on cloudsense-cache')
    } else {
      console.error('⚠ TTL setup error:', e.message)
    }
  }
}

async function createSNSTopic() {
  try {
    const res = await sns.send(new CreateTopicCommand({ Name: 'cloudsense-alerts' }))
    console.log(`✓ SNS Topic ARN: ${res.TopicArn}`)
    console.log('  → Add this ARN to your .env file as SNS_ALERT_TOPIC_ARN')
  } catch (e) {
    console.error('⚠ SNS topic error:', e.message)
  }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  CloudSense Infrastructure Setup')
  console.log('═══════════════════════════════════════')
  console.log(`Region: ${region}\n`)

  await createTables()
  console.log('')
  await createSNSTopic()

  console.log('\n═══════════════════════════════════════')
  console.log('  Setup Complete!')
  console.log('═══════════════════════════════════════')
}

main().catch(console.error)
