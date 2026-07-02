const { ddbClient, TABLES: _TABLES, GetCommand, PutCommand } = require('../config/awsClients')
const { TABLES, CACHE_TTL } = require('../config/constants')

async function getCache(key) {
  try {
    const { Item } = await ddbClient.send(new GetCommand({ TableName: TABLES.cache, Key: { CacheKey: key } }))
    if (Item && Item.ttl > Math.floor(Date.now() / 1000)) return JSON.parse(Item.data)
    return null
  } catch { return null }
}

async function setCache(key, data, ttlSeconds = CACHE_TTL) {
  try {
    await ddbClient.send(new PutCommand({
      TableName: TABLES.cache,
      Item: { CacheKey: key, data: JSON.stringify(data), ttl: Math.floor(Date.now() / 1000) + ttlSeconds }
    }))
  } catch (e) { console.error('Cache set error:', e.message) }
}

module.exports = { getCache, setCache }
