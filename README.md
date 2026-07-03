# CostForge - Cloud Cost Intelligence Dashboard
### 22North Product Engineering Challenge 2026

## Quick Start
1. Clone repo and run `npm install` in both `frontend` and `backend` directories.
2. Run `npm run seed` in the backend directory to populate the test data.
3. Run `npm run dev` in both directories to start the development servers.

## Live Demo
**Evaluate the Project Live:** [https://dji1sh2llkd41.cloudfront.net](https://dji1sh2llkd41.cloudfront.net)

## Demo Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@cloudsense.io | Admin@CloudSense123 |
| Editor | d24dce144@charusat.edu.in | D24DCE144@heet |
| Viewer | heetkv9@gmail.com | Heet@123456 |

## Project Overview

### Problem Statement
Rapidly growing SaaS companies struggle with unpredictable and opaque cloud infrastructure costs, leading to wasted spend and budget overruns. Existing tools are often too complex, lack granular visibility at the user or API level, and fail to provide actionable, easy-to-understand optimization recommendations.

### Solution
CostForge is a unified cloud cost intelligence platform that provides granular cost attribution down to the user and API endpoint levels. It leverages AWS Cost Explorer and Trusted Advisor APIs to deliver real-time infrastructure visibility, anomaly detection alerts, and actionable savings recommendations in an intuitive, FinOps-friendly dashboard.

## Key Features
- **Granular Cost Attribution**: Track costs by AWS Service, organizational Role, specific Users, and individual API endpoints.
- **Actionable Savings**: Direct integration with AWS Trusted Advisor to surface concrete cost-saving opportunities.
- **Smart Alerting**: Configure custom cost thresholds and receive alerts when spending anomalies are detected.
- **Automated Reporting**: Generate on-demand or scheduled PDF/CSV cost reports for stakeholders.
- **IAM Role Exploration**: Audit and monitor AWS IAM roles directly from the dashboard.
- **CloudWatch Log Insights**: Integrated querying for monitoring system health and application logs.
- **Role-Based Access Control**: Secure platform with granular permissions for Admins, Editors, and Viewers.
- **Dark/Light Theme**: Modern, responsive UI with a premium dark mode designed for FinOps engineers.

## Technology Stack
| Layer | Technology | Version |
|---|---|---|
| Frontend | React (Vite) | 18.x |
| Backend | Node.js / Express | 18.x / 4.x |
| Database | DynamoDB (AWS SDK v3) | v3 |
| Serverless | AWS Lambda | Node.js 20.x |
| Storage | Amazon S3 & CloudFront | N/A |
| Charts | Recharts | 2.12.x |
| Auth | JWT & bcrypt | N/A |

## Architecture
CostForge uses a decoupled microservices architecture with a React SPA frontend hosted on S3 and CloudFront, and a Node.js REST API backend on EC2. It leverages AWS DynamoDB for high-performance, serverless data storage and integrates with various AWS services (Cost Explorer, Trusted Advisor, CloudWatch, Lambda).
[See full architecture docs](/docs/02_architecture)

## Installation & Run Instructions
```bash
git clone <repository-url>
cd Cloud-Cost-Intelligence_22northPhonon

# Backend setup
cd backend
npm install
cp .env.example .env

# Frontend setup
cd ../frontend
npm install
cp .env.example .env

# Start apps
cd ../backend && npm run dev
cd ../frontend && npm run dev
```

## Deployment Instructions
The application is deployed across several AWS services for a highly scalable, serverless-hybrid architecture:

1. **Frontend (CloudFront + S3):**
   - The React app is built using `npm run build`.
   - The static assets are uploaded to an S3 bucket configured for static hosting.
   - An Amazon CloudFront distribution serves the assets globally via HTTPS (see Live Demo link).
2. **Backend (EC2):**
   - The Node.js Express API is deployed on an Ubuntu EC2 instance.
   - It is managed using `pm2` (`pm2 start server.js`) to ensure it runs continuously.
   - Nginx is configured as a reverse proxy to route API traffic securely.
3. **Database (DynamoDB):**
   - All user data, active alerts, and cached AWS cost telemetry are stored in Amazon DynamoDB.
4. **Reports (Lambda + S3):**
   - Background jobs for generating PDF/CSV cost reports are handled securely by AWS Lambda and stored in a private S3 bucket.

*(For a full step-by-step technical deployment guide, see `docs/05_deployment/deployment_instructions.md`)*

## Seeding Initial Credentials
Because CostForge fetches live cost and IAM data directly from your configured AWS Account, there is no mock test data required. The seed script simply creates the three demo user credentials in your DynamoDB table.

```bash
cd backend
npm run seed
```

## Challenge Requirements Documentation

# API Reference Summary

The CostForge RESTful API provides endpoints for authentication, user management, and cloud cost telemetry. All data is returned in JSON format. Authenticated routes require a valid JWT token.

## Auth Endpoints
* `POST /api/auth/register` - Register a new user
* `POST /api/auth/login` - Authenticate and receive JWT
* `POST /api/auth/logout` - Terminate session
* `POST /api/auth/send-otp` - Password recovery verification
* `POST /api/auth/verify-otp` - Validate OTP
* `POST /api/auth/forgot-password` - Initiate password reset
* `POST /api/auth/reset-password` - Finalize password reset
* `GET /api/auth/me` - Get current authenticated user profile

## User Endpoints
* `GET /api/users/profile` - Fetch user profile details
* `PUT /api/users/profile` - Update user profile information
* `PATCH /api/users/change-password` - Update user password securely

## Admin Endpoints
* `GET /api/admin/users` - List all registered users
* `POST /api/admin/users` - Create a new user (Admin only)
* `DELETE /api/admin/users/:id` - Remove a user
* `PATCH /api/admin/users/:id/status` - Activate/Deactivate a user account
* `PATCH /api/admin/users/:id/role` - Modify user permissions (Admin/Editor/Viewer)
* `GET /api/admin/logs` - Fetch system audit logs
* `GET /api/admin/logs?userId=&startDate=&endDate=` - Query specific audit trails

## Cost Endpoints
* `GET /api/cost/summary` - High-level aggregated spend
* `GET /api/cost/by-service` - Spend broken down by AWS service
* `GET /api/cost/monthly-trend` - Historical trending data


---

# Assumptions for CostForge

The design and development of CostForge are based on the following key assumptions. These assumptions guide the architectural decisions, feature prioritization, and testing strategies.

1. **Live AWS Integration Assumed:** The application is deployed live and relies on real-time integration with the user's actual AWS account via the AWS SDK to fetch billing telemetry and Trusted Advisor insights. No mock or dummy cost data is used.
2. **AWS Account Configuration:** It is assumed that the target AWS account has AWS Cost Explorer enabled and contains active usage data to be queried.
3. **Single Region Deployment Assumed:** The initial deployment architecture assumes hosting and operation within a single AWS region (e.g., us-east-1). Multi-region high availability or disaster recovery is not in scope for the initial release.
4. **English Language Only:** The user interface, documentation, and notifications are designed exclusively in English. Localization and internationalization (i18n) are not currently planned for the initial rollout.
5. **Modern Browser Support Assumed:** The web application targets modern, evergreen web browsers (latest versions of Chrome, Firefox, Safari, Edge). Support for legacy browsers (e.g., Internet Explorer) is explicitly excluded.
6. **Email Delivery via SES Assumed Available:** It is assumed that the AWS Simple Email Service (SES) environment is properly configured, out of the sandbox mode, and capable of reliably delivering transactional emails without excessive throttling.
7. **Role Hierarchy Assumptions:** The system assumes a standard Role-Based Access Control (RBAC) model with predefined, fixed roles (e.g., Admin, Editor, Viewer) that cover all necessary permission scopes without the immediate need for custom role creation.
8. **Cost Calculation Methodology Assumptions:** The platform assumes standard, unblended rates for cost calculations directly fetched from Cost Explorer. Complex discount structures like Enterprise Discount Programs (EDP) or custom negotiated rates are handled natively by AWS before the data hits our API.
9. **AWS Support Plan Tier Assumed:** It is assumed the target AWS accounts being analyzed possess at least the AWS Business Support plan, granting access to the necessary programmatic APIs (e.g., AWS Trusted Advisor API) required for deeper insights and recommendations.


---

# Known Limitations of CostForge

This document outlines the known limitations of the CostForge platform. We maintain this list to provide full transparency and to guide future engineering efforts.

### 1. Lack of Multi-Cloud Support
* **What:** The platform currently only analyzes and reports on Amazon Web Services (AWS) costs.
* **Why:** Initial project scope was tightly focused on delivering deep value for the most prominent cloud provider to ensure time-to-market and high-quality insights.
* **Impact:** Organizations utilizing a multi-cloud strategy (e.g., AWS + Azure + GCP) cannot view their unified cloud spend in a single dashboard.
* **Resolution:** Multi-cloud ingestion modules are planned for a future major release (Phase 3), starting with Microsoft Azure.

### 2. Real-Time Cost Updates Are Not Supported
* **What:** Cost data is updated on a batch schedule (typically daily) rather than in real-time.
* **Why:** AWS Cost and Usage Reports (CUR) and the Cost Explorer API inherently have a delay (often 24-48 hours) in finalizing billing data.
* **Impact:** Users cannot see the financial impact of infrastructure changes made within the last few hours.
* **Resolution:** We will investigate integrating with AWS EventBridge and CloudTrail for near real-time resource creation events to provide estimated "run-rate" updates, though finalized billing will always have a delay.

### 3. Limited Custom Role Creation
* **What:** Users are restricted to predefined roles (Admin, Finance, User) and cannot create granular, custom permission sets.
* **Why:** To accelerate initial development and reduce the complexity of the security matrix, a strict predefined Role-Based Access Control (RBAC) model was implemented.
* **Impact:** Large enterprise clients may find the predefined roles too broad or restrictive for their specific departmental needs.
* **Resolution:** An Advanced Permissions module utilizing Attribute-Based Access Control (ABAC) is slated for Phase 2 development.

### 4. No Mobile Application
* **What:** CostForge does not have a dedicated native mobile application (iOS/Android).
* **Why:** Resources were allocated to building a robust backend and a responsive web application as the primary interfaces for data-dense dashboards.
* **Impact:** On-the-go monitoring is reliant on the responsive web design, which may not be as seamless as a native app for complex chart interactions.
* **Resolution:** The web application is designed to be mobile-responsive. If user demand dictates, a lightweight companion mobile app for alerts and basic overviews will be considered.

### 5. Historical Data Retention Limits
* **What:** Detailed, resource-level cost data is only retained for 12 months.
* **Why:** Storing highly granular time-series data indefinitely in DynamoDB incurs significant storage costs and impacts query performance.
* **Impact:** Year-over-year comparisons beyond a 12-month window are limited to aggregated, high-level data rather than resource-specific trends.
* **Resolution:** Implement a data lifecycle policy to archive older granular data to cold storage (AWS S3 Glacier) where it can be queried asynchronously if needed.


---

# Future Enhancements & Roadmap for CostForge

This document outlines the strategic roadmap for CostForge, structured by deployment phases.

## Roadmap Overview

### Phase 1 (Next Sprint)
Focuses on immediate quality-of-life improvements and essential functional gaps identified during initial rollout.

| Feature | Business Value | Effort | Priority |
| :--- | :--- | :--- | :--- |
| **Custom Alert Thresholds** | Allows users to set specific budget limits and receive notifications, preventing bill shock. | Medium | High |
| **Export to CSV/PDF** | Enables finance teams to easily share reports and integrate data with external accounting software. | Low | High |
| **Dark Mode UI** | Improves user experience and accessibility for engineers monitoring dashboards in low-light environments. | Low | Medium |
| **Resource Tag Mapping** | Provides better cost allocation by automatically categorizing untagged resources based on naming conventions. | Medium | High |

### Phase 2 (Next Month)
Focuses on expanding the platform's analytical capabilities and enterprise readiness.

| Feature | Business Value | Effort | Priority |
| :--- | :--- | :--- | :--- |
| **Custom RBAC Roles** | Unlocks enterprise adoption by allowing granular, departmental-specific access control. | High | High |
| **Anomaly Detection (Basic)** | Automatically flags unusual spending spikes using statistical thresholds, reducing manual monitoring. | High | High |
| **Reserved Instance Recommendations** | Provides actionable insights on purchasing RIs/Savings Plans to reduce compute costs. | High | Medium |
| **SSO / SAML Integration** | Streamlines onboarding and enhances security for corporate users via Azure AD or Okta. | Medium | High |

### Phase 3 (Next Quarter)
Focuses on major architectural expansions and advanced AI-driven features.

| Feature | Business Value | Effort | Priority |
| :--- | :--- | :--- | :--- |
| **Multi-Cloud Support (Azure)** | Expands total addressable market by supporting hybrid and multi-cloud enterprise environments. | Very High | High |
| **AI Cost Forecasting** | Uses machine learning models to accurately predict future spend based on historical seasonal trends. | High | Medium |
| **Automated Remediation** | Allows users to authorize the platform to automatically shut down idle non-production resources. | Very High | Low |
| **Data Archival to S3 Glacier** | Reduces database costs while allowing long-term retention of granular data for compliance. | Medium | Medium |


---

# AI Tools Used in CostForge

During the development of CostForge, several AI-powered assistants were utilized to enhance productivity and accelerate the delivery timeline.

## Statement of Use

> All AI tools were used as engineering assistants. All engineering decisions, architecture choices, and design decisions were made by the developer. AI tools accelerated implementation and documentation.

## Tools Utilized

* **Claude:** Utilized primarily for generating complex technical documentation, refining architectural designs, and brainstorming edge cases in data modeling.
* **ChatGPT:** Used for quick syntax lookups, debugging complex regex patterns, and drafting initial project management structures.
* **Antigravity:** Used as an autonomous coding agent to rapidly audit, refactor, and generate robust end-to-end documentation across the repository.


## License
MIT
