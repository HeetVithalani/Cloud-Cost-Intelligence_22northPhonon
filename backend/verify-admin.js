/**
 * Verify that Admin@123456 works for heetkv9@gmail.com
 * This script does NOT modify anything — read-only check
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { ddbClient, ScanCommand } = require('./config/awsClients')
const { TABLES } = require('./config/constants')

async function verify() {
  const email = 'heetkv9@gmail.com'
  const testPassword = 'Admin@123456'

  console.log(`\n🔍 Looking up ${email} in DynamoDB table: ${TABLES.users}`)
  const { Items } = await ddbClient.send(new ScanCommand({
    TableName: TABLES.users,
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  if (!Items || Items.length === 0) {
    console.error(`❌ User ${email} NOT FOUND in DynamoDB.`)
    process.exit(1)
  }

  const user = Items[0]
  console.log(`✅ User found:`)
  console.log(`   UserID:    ${user.UserID}`)
  console.log(`   Email:     ${user.email}`)
  console.log(`   Name:      ${user.name}`)
  console.log(`   Role:      ${user.role}`)
  console.log(`   Active:    ${user.active}`)
  console.log(`   CreatedAt: ${user.createdAt}`)
  console.log(`   Hash:      ${user.password?.substring(0, 20)}...`)

  console.log(`\n🔐 Testing bcrypt.compare("${testPassword}", hash)...`)
  const match = await bcrypt.compare(testPassword, user.password)

  if (match) {
    console.log(`✅ PASSWORD MATCH — Login will work with Admin@123456`)
  } else {
    console.log(`❌ PASSWORD MISMATCH — The stored hash does NOT match "Admin@123456"`)
    console.log(`   This means the admin was created with a DIFFERENT password.`)
    console.log(`   To fix: delete the user and re-run seed-admin.js`)
    console.log(`\n   Attempting to re-hash and update...`)

    const { UpdateCommand } = require('./config/awsClients')
    const newHash = await bcrypt.hash(testPassword, 12)
    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.users,
      Key: { UserID: user.UserID },
      UpdateExpression: 'SET password = :p, updatedAt = :t',
      ExpressionAttributeValues: { ':p': newHash, ':t': new Date().toISOString() },
    }))
    console.log(`✅ Password UPDATED to Admin@123456 for ${email}`)
  }

  // Also verify role is Admin (not Viewer/Editor)
  if (user.role !== 'Admin') {
    console.log(`\n⚠️  Role is "${user.role}" but should be "Admin". Fixing...`)
    const { UpdateCommand } = require('./config/awsClients')
    await ddbClient.send(new UpdateCommand({
      TableName: TABLES.users,
      Key: { UserID: user.UserID },
      UpdateExpression: 'SET #r = :r',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':r': 'Admin' },
    }))
    console.log(`✅ Role updated to Admin`)
  }

  process.exit(0)
}

verify().catch(e => {
  console.error(`❌ Verify error:`, e.message)
  process.exit(1)
})
