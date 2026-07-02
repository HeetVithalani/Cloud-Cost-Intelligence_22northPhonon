# CloudSense — AWS Monitoring Dashboard

A FinOps-friendly AWS monitoring platform that provides unified resource visibility, cost analytics, IAM role exploration, and operational monitoring — all in a single dark-themed control room interface.

## Features

- **Unified Resource View** — EC2, S3, RDS, Lambda in one dashboard
- **IAM Role Explorer** — Filter resources across all services by IAM role (unique capability not available in AWS Console)
- **Cost & FinOps** — MTD cost, forecasts, service breakdown, budget alerts
- **CloudWatch Integration** — Alarms, metric explorer, log insights
- **Trusted Advisor** — Security, cost optimization, performance checks
- **PDF Reports** — Generated via AWS Lambda with PDFKit
- **Real-time Alerts** — SNS email + Slack webhook notifications

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, TanStack Query v5, Recharts, Lucide React, Axios |
| Backend | Node.js, Express.js, AWS SDK v3 |
| Database | AWS DynamoDB (free tier) |
| Reports | AWS Lambda + PDFKit → S3 |
| Alerts | AWS SNS + Slack Webhooks |

## Quick Start

### 1. Infrastructure Setup
```bash
cd infrastructure
node setup.js
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your AWS config
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` and login with your configured admin credentials (seeded on first run).

## AWS Configuration

The backend uses the AWS SDK default credential chain:
1. **EC2 Instance Role** (production) — attach the IAM policy from `infrastructure/iam-policy.json`
2. **~/.aws/credentials** (local development) — configure via `aws configure`

> ⚠️ **Never** hardcode AWS credentials in source code.

## Project Structure

```
cloudsense/
├── frontend/          # React SPA (4 source files)
├── backend/           # Express API (1 source file)
├── lambda/            # PDF report generator
└── infrastructure/    # IAM policy + DynamoDB/SNS setup
```

## License

MIT
