const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { ddbClient, ScanCommand, PutCommand, CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } = require('../config/awsClients')
const { TABLES } = require('../config/constants')

async function tableExists(name) {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: name }))
    return true
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return false
    throw e
  }
}

async function ensureTables() {
  const tableDefs = [
    { TableName: TABLES.users,      KeySchema: [{ AttributeName: 'UserID', KeyType: 'HASH' }],                                                                         AttributeDefinitions: [{ AttributeName: 'UserID', AttributeType: 'S' }] },
    { TableName: TABLES.metrics,    KeySchema: [{ AttributeName: 'ResourceID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }],                   AttributeDefinitions: [{ AttributeName: 'ResourceID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
    { TableName: TABLES.costs,      KeySchema: [{ AttributeName: 'CostID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }],                       AttributeDefinitions: [{ AttributeName: 'CostID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
    { TableName: TABLES.alerts,     KeySchema: [{ AttributeName: 'AlertID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }],                      AttributeDefinitions: [{ AttributeName: 'AlertID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
    { TableName: TABLES.alertRules, KeySchema: [{ AttributeName: 'RuleID', KeyType: 'HASH' }],                                                                         AttributeDefinitions: [{ AttributeName: 'RuleID', AttributeType: 'S' }] },
    { TableName: TABLES.cache,      KeySchema: [{ AttributeName: 'CacheKey', KeyType: 'HASH' }],                                                                       AttributeDefinitions: [{ AttributeName: 'CacheKey', AttributeType: 'S' }] },
    { TableName: TABLES.settings,   KeySchema: [{ AttributeName: 'SettingKey', KeyType: 'HASH' }],                                                                     AttributeDefinitions: [{ AttributeName: 'SettingKey', AttributeType: 'S' }] },
    { TableName: TABLES.reports,    KeySchema: [{ AttributeName: 'ReportID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }],                     AttributeDefinitions: [{ AttributeName: 'ReportID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
    // Activity logs table — new for Feature 5
    { TableName: 'cloudsense-activity-logs', KeySchema: [{ AttributeName: 'LogID', KeyType: 'HASH' }, { AttributeName: 'Timestamp', KeyType: 'RANGE' }], AttributeDefinitions: [{ AttributeName: 'LogID', AttributeType: 'S' }, { AttributeName: 'Timestamp', AttributeType: 'S' }] },
  ]

  for (const def of tableDefs) {
    try {
      const exists = await tableExists(def.TableName)
      if (!exists) {
        await ddbClient.send(new CreateTableCommand({ ...def, BillingMode: 'PAY_PER_REQUEST' }))
        console.log(`✓ Created table: ${def.TableName}`)
      }
    } catch (e) { console.error(`⚠ Table ${def.TableName}:`, e.message) }
  }

  // Enable TTL on cache and activity-logs tables
  for (const [tableName, attr] of [['cloudsense-cache', 'ttl'], ['cloudsense-activity-logs', 'ttl']]) {
    try {
      await ddbClient.send(new UpdateTimeToLiveCommand({ TableName: tableName, TimeToLiveSpecification: { Enabled: true, AttributeName: attr } }))
    } catch (e) { /* TTL may already be enabled */ }
  }
}

async function seedAdmin() {
  try {
    const adminEmail = 'heetkv9@gmail.com'
    // Check if this specific admin already exists (not whether table is empty)
    const { Items } = await ddbClient.send(new ScanCommand({ TableName: TABLES.users, FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': adminEmail } }))
    if (Items && Items.length > 0) {
      console.log(`✓ Admin user already exists: ${adminEmail}`)
      return
    }
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456'
    if (adminPassword.length < 8) {
      console.error('⚠ ADMIN_INITIAL_PASSWORD must be at least 8 characters. Skipping seed.')
      return
    }
    const hash = await bcrypt.hash(adminPassword, 12)
    await ddbClient.send(new PutCommand({
      TableName: TABLES.users,
      Item: { UserID: uuidv4(), email: adminEmail, password: hash, name: 'Admin', role: 'Admin', active: true, createdAt: new Date().toISOString() },
    }))
    console.log(`✓ Seeded admin user: ${adminEmail}`)
  } catch (e) { console.error('⚠ Seed admin error:', e.message) }
}

module.exports = { ensureTables, seedAdmin }
