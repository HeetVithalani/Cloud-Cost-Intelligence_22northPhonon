const router = require('express').Router()
const { getEC2Instances, getEC2Detail } = require('../services/ec2Service')
const { getS3Buckets } = require('../services/s3Service')
const { getRDSInstances } = require('../services/rdsService')
const { getLambdaFunctions } = require('../services/lambdaService')
const { authMiddleware } = require('../middleware/auth')
const { ok, err } = require('../helpers/response')

router.get('/ec2', authMiddleware, async (req, res) => {
  try { ok(res, await getEC2Instances(req.query)) } catch (e) { err(res, e.message) }
})

router.get('/ec2/:id', authMiddleware, async (req, res) => {
  // IDOR protection: validate AWS EC2 instance ID format (i-xxxxxxxxxxxxxxxxx)
  if (!/^i-[0-9a-f]{8,17}$/.test(req.params.id)) return err(res, 'Invalid instance ID format', 400)
  try { ok(res, await getEC2Detail(req.params.id)) } catch (e) { err(res, e.message) }
})

router.get('/s3', authMiddleware, async (req, res) => {
  try { ok(res, await getS3Buckets()) } catch (e) { err(res, e.message) }
})

router.get('/rds', authMiddleware, async (req, res) => {
  try { ok(res, await getRDSInstances()) } catch (e) { err(res, e.message) }
})

router.get('/lambda', authMiddleware, async (req, res) => {
  try { ok(res, await getLambdaFunctions()) } catch (e) { err(res, e.message) }
})

module.exports = router
