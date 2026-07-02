const PDFDocument = require('pdfkit')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer')
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2')
const { IAMClient, ListRolesCommand, ListAttachedRolePoliciesCommand } = require('@aws-sdk/client-iam')

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })
const costClient = new CostExplorerClient({ region: 'us-east-1' })
const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' })
const iamClient = new IAMClient({ region: 'us-east-1' })

const BUCKET = process.env.REPORTS_S3_BUCKET || 'cloudsense-reports'
const COLORS = { navyBg: '#080C14', surface: '#0D1421', cyan: '#00D4FF', white: '#E8F0FE', muted: '#7B8FAD', green: '#00FF88', red: '#FF3B5C', amber: '#FFB800' }

exports.handler = async (event) => {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event
  const { type, dateRange, options, requestId } = body

  // --- INPUT VALIDATION ---
  const validTypes = ['cost', 'health', 'iam', 'optimization']
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid report type: ${type}`)
  }

  if (!requestId || typeof requestId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(requestId)) {
    throw new Error('Invalid or missing requestId')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `${type}-report-${timestamp}.pdf`
  // Sanitize requestId to prevent any path traversal (even though regex above helps)
  const safeRequestId = requestId.replace(/[^a-zA-Z0-9-]/g, '')
  const s3Key = `${safeRequestId}/${fileName}`

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  const chunks = []
  doc.on('data', chunk => chunks.push(chunk))

  // Header
  doc.rect(0, 0, 595, 80).fill(COLORS.navyBg)
  doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.cyan).text('CloudSense', 50, 25)
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('AWS Monitoring Platform', 50, 52)
  doc.fontSize(10).fillColor(COLORS.white).text(`${type.toUpperCase()} REPORT`, 400, 30, { align: 'right' })
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 400, 45, { align: 'right' })
  doc.moveDown(3)

  // Report content based on type
  doc.fillColor('#333').font('Helvetica-Bold').fontSize(16)

  if (type === 'cost') {
    doc.text('Cost Analysis Report', 50, 100)
    doc.moveDown()
    doc.font('Helvetica').fontSize(11).fillColor('#555')
    try {
      const now = new Date()
      const start = dateRange?.start ? new Date(dateRange.start) : new Date(now.getFullYear(), now.getMonth(), 1)
      const end = dateRange?.end ? new Date(dateRange.end) : now
      const fmt = d => d.toISOString().split('T')[0]
      const { ResultsByTime } = await costClient.send(new GetCostAndUsageCommand({ TimePeriod: { Start: fmt(start), End: fmt(end) }, Granularity: 'DAILY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] }))
      let total = 0; const services = {}
      for (const t of (ResultsByTime || [])) { for (const g of (t.Groups || [])) { const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount || 0); total += amt; services[g.Keys?.[0] || 'Other'] = (services[g.Keys?.[0] || 'Other'] || 0) + amt } }
      doc.text(`Period: ${fmt(start)} to ${fmt(end)}`)
      doc.text(`Total Cost: $${total.toFixed(2)}`)
      doc.moveDown()
      doc.font('Helvetica-Bold').text('Cost by Service:')
      doc.font('Helvetica')
      const sorted = Object.entries(services).sort((a, b) => b[1] - a[1])
      const rowColors = [COLORS.surface, '#161E30']
      let y = doc.y + 10
      for (let i = 0; i < sorted.length && i < 20; i++) {
        doc.fillColor(i % 2 === 0 ? '#333' : '#555').text(`  ${sorted[i][0]}: $${sorted[i][1].toFixed(2)}`, 50, y)
        y += 18
      }
    } catch (e) { doc.text(`Error fetching cost data: ${e.message}`) }
  } else if (type === 'health') {
    doc.text('Infrastructure Health Report', 50, 100)
    doc.moveDown()
    doc.font('Helvetica').fontSize(11).fillColor('#555')
    try {
      const { Reservations } = await ec2Client.send(new DescribeInstancesCommand({}))
      let total = 0, running = 0, stopped = 0
      for (const r of (Reservations || [])) { for (const i of (r.Instances || [])) { total++; if (i.State?.Name === 'running') running++; if (i.State?.Name === 'stopped') stopped++ } }
      doc.text(`EC2 Instances: ${total} total, ${running} running, ${stopped} stopped`)
    } catch (e) { doc.text(`Error fetching EC2 data: ${e.message}`) }
  } else if (type === 'iam') {
    doc.text('IAM Audit Report', 50, 100)
    doc.moveDown()
    doc.font('Helvetica').fontSize(11).fillColor('#555')
    try {
      const { Roles } = await iamClient.send(new ListRolesCommand({ MaxItems: 100 }))
      doc.text(`Total IAM Roles: ${Roles?.length || 0}`)
      doc.moveDown()
      for (const role of (Roles || []).slice(0, 30)) {
        doc.font('Helvetica-Bold').text(role.RoleName)
        doc.font('Helvetica').fontSize(9).fillColor('#888').text(role.Arn)
        doc.fontSize(11).fillColor('#555')
        doc.moveDown(0.5)
      }
    } catch (e) { doc.text(`Error fetching IAM data: ${e.message}`) }
  } else {
    doc.text('Optimization Report', 50, 100)
    doc.moveDown()
    doc.font('Helvetica').fontSize(11).fillColor('#555')
    doc.text('Review your Trusted Advisor recommendations in the CloudSense dashboard for optimization opportunities.')
  }

  // Footer
  const pages = doc.bufferedPageRange()
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i)
    doc.fontSize(8).fillColor(COLORS.muted).text(`Generated by CloudSense | ${new Date().toISOString()} | Page ${i + 1} of ${pages.count}`, 50, 770, { align: 'center', width: 495 })
  }

  doc.end()
  const buffer = await new Promise(resolve => { doc.on('end', () => resolve(Buffer.concat(chunks))) })

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: buffer, ContentType: 'application/pdf', Metadata: { reportType: type, generatedAt: new Date().toISOString() } }))

  return { s3Key, fileName, size: buffer.length }
}
