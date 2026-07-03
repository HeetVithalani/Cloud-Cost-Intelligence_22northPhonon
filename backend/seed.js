require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
  }
});
const ddb = DynamoDBDocumentClient.from(client);

// Dummy tables based on existing constants (assume cloudsense-* prefix)
const TABLES = {
  users: 'cloudsense-users',
  costs: 'cloudsense-costs',
  iam_roles: 'cloudsense-iam-roles',
  trusted_advisor: 'cloudsense-trusted-advisor',
  alerts: 'cloudsense-alerts',
  reports: 'cloudsense-reports',
  activity_logs: 'cloudsense-activity-logs'
};

async function clearTable(tableName, keyName) {
  try {
    const { Items } = await ddb.send(new ScanCommand({ TableName: tableName }));
    if (!Items || Items.length === 0) return;
    console.log(`Clearing ${Items.length} items from ${tableName}...`);
    for (const item of Items) {
      await ddb.send(new DeleteCommand({
        TableName: tableName,
        Key: { [keyName]: item[keyName] }
      }));
    }
  } catch (e) {
    console.log(`Table ${tableName} might not exist or error clearing:`, e.message);
  }
}

async function seedUsers() {
  const adminPassword = await bcrypt.hash('Admin@CloudSense123', 12);
  const editorPassword = await bcrypt.hash('D24DCE144@heet', 12);
  const viewerPassword = await bcrypt.hash('Heet@123456', 12);
  
  const users = [
    { UserID: uuidv4(), email: 'admin@cloudsense.io', password: adminPassword, role: 'Admin', active: true },
    { UserID: uuidv4(), email: 'd24dce144@charusat.edu.in', password: editorPassword, role: 'Editor', active: true },
    { UserID: uuidv4(), email: 'heetkv9@gmail.com', password: viewerPassword, role: 'Viewer', active: true }
  ];
  
  for (const user of users) {
    await ddb.send(new PutCommand({ TableName: TABLES.users, Item: user }));
  }
  console.log('✅ Seeded Users for live AWS fetch');
}

async function runSeed() {
  console.log('🌱 Starting database seed...');
  if (process.env.AWS_ACCESS_KEY_ID === 'dummy' && process.env.NODE_ENV !== 'test') {
    console.log('⚠️ AWS Credentials not fully configured. Seed script is running in dry-run/mock mode.');
    return;
  }
  
  try {
    // Attempting to clear existing first
    await clearTable(TABLES.users, 'UserID');
    
    // Only seeding users; the dashboard fetches live AWS data via Cost Explorer / Trusted Advisor
    await seedUsers();
    
    console.log('🎉 Seeding complete! Login with the provided credentials to view your live AWS data.');
  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
  }
}

runSeed();
