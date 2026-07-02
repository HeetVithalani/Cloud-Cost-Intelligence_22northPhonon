/**
 * Standalone Admin Seed Script
 * Creates admin user: heetkv9@gmail.com / Admin@123456
 * 
 * Usage:
 *   Local:  node seed-admin.js
 *   AWS:    ssh into EC2, cd to backend dir, node seed-admin.js
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { ddbClient, ScanCommand, PutCommand } = require('./config/awsClients')
const { TABLES } = require('./config/constants')

const ADMIN_EMAIL = 'heetkv9@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456'
const ADMIN_NAME = 'Admin'
const ADMIN_ROLE = 'Admin'

async function seedAdmin() {
  console.log('─────────────────────────────────────────')
  console.log('CloudSense — Admin Seed Script')
  console.log('─────────────────────────────────────────')

  // 1. Check if admin already exists
  console.log(`\n🔍 Checking if ${ADMIN_EMAIL} already exists...`)
  const { Items } = await ddbClient.send(new ScanCommand({
    TableName: TABLES.users,
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': ADMIN_EMAIL },
  }))

  if (Items && Items.length > 0) {
    console.log(`⚠️  Admin already exists in DynamoDB:`)
    console.log(`   UserID: ${Items[0].UserID}`)
    console.log(`   Email:  ${Items[0].email}`)
    console.log(`   Role:   ${Items[0].role}`)
    console.log(`   Active: ${Items[0].active}`)
    console.log(`\n   No action taken. To recreate, delete the user first.`)
    process.exit(0)
  }

  // 2. Validate password strength
  const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/
  if (ADMIN_PASSWORD.length < 8 || !strongPw.test(ADMIN_PASSWORD)) {
    console.error(`❌ Password "${ADMIN_PASSWORD}" does not meet strength requirements:`)
    console.error(`   ✅ Min 8 chars   : ${ADMIN_PASSWORD.length >= 8 ? 'PASS' : 'FAIL'}`)
    console.error(`   ✅ 1 uppercase   : ${/[A-Z]/.test(ADMIN_PASSWORD) ? 'PASS' : 'FAIL'}`)
    console.error(`   ✅ 1 lowercase   : ${/[a-z]/.test(ADMIN_PASSWORD) ? 'PASS' : 'FAIL'}`)
    console.error(`   ✅ 1 number      : ${/\d/.test(ADMIN_PASSWORD) ? 'PASS' : 'FAIL'}`)
    console.error(`   ✅ 1 special char: ${/[\W_]/.test(ADMIN_PASSWORD) ? 'PASS' : 'FAIL'}`)
    process.exit(1)
  }

  // 3. Hash password (ONCE — bcrypt with 12 salt rounds)
  console.log(`\n🔐 Hashing password with bcrypt (12 rounds)...`)
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  // 4. Create admin in DynamoDB
  const userId = uuidv4()
  console.log(`📝 Creating admin user...`)
  await ddbClient.send(new PutCommand({
    TableName: TABLES.users,
    Item: {
      UserID: userId,
      email: ADMIN_EMAIL,
      password: hash,
      name: ADMIN_NAME,
      role: ADMIN_ROLE,
      active: true,
      createdAt: new Date().toISOString(),
    },
  }))

  // 5. Verify it was written
  console.log(`\n🔍 Verifying admin was created...`)
  const verify = await ddbClient.send(new ScanCommand({
    TableName: TABLES.users,
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': ADMIN_EMAIL },
  }))

  if (verify.Items?.length > 0) {
    console.log(`\n✅ SUCCESS — Admin user created!`)
    console.log(`─────────────────────────────────────────`)
    console.log(`   UserID:   ${userId}`)
    console.log(`   Email:    ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`   Role:     ${ADMIN_ROLE}`)
    console.log(`   Table:    ${TABLES.users}`)
    console.log(`─────────────────────────────────────────`)
    console.log(`\n🔑 Login at your frontend with:`)
    console.log(`   Email:    ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
  } else {
    console.error(`\n❌ FAILED — Admin was not found after write. Check DynamoDB permissions.`)
  }

  process.exit(0)
}

seedAdmin().catch(e => {
  console.error(`\n❌ Seed script error:`, e.message)
  console.error(e.stack)
  process.exit(1)
})
