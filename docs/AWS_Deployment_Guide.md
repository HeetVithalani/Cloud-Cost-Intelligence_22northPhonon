# Comprehensive AWS Deployment Guide for CostForge

This document provides a detailed, step-by-step walkthrough of how CostForge is deployed in a live production environment on Amazon Web Services (AWS). The architecture is completely serverless for the frontend and database, utilizing a robust EC2 instance for the backend.

---

## 1. Prerequisites
Before beginning the deployment process, ensure you have the following:
* An active **AWS Account** with billing enabled.
* An **IAM User** with programmatic access keys (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).
* The IAM User must have permissions for **EC2, S3, CloudFront, DynamoDB, Cost Explorer, and Trusted Advisor**.
* Node.js (v18+) and npm installed locally.

---

## 2. Database Provisioning (Amazon DynamoDB)
CostForge uses DynamoDB for NoSQL data storage. Manual table creation is **not required**.
1. The backend application includes an auto-provisioning script (`helpers/dynamo.js`).
2. Upon the first backend startup, the application connects to AWS and automatically provisions all required tables (Users, Costs, Metrics, Alerts, Reports, Cache, Activity Logs).
3. The tables are configured with **PAY_PER_REQUEST** (On-Demand) billing mode to minimize costs during idle periods.

---

## 3. Backend Deployment (Amazon EC2)
The backend API is a Node.js Express server running on Amazon EC2.

### Step 3.1: Provision the EC2 Instance
1. Navigate to the EC2 Dashboard in the AWS Console.
2. Click **Launch Instance**.
3. **AMI:** Select Ubuntu Server 22.04 LTS or Amazon Linux 2023.
4. **Instance Type:** `t3.micro` or `t3.small` (depending on expected load).
5. **Key Pair:** Create or select an existing key pair for SSH access.
6. **Network Settings:** Create a Security Group with the following inbound rules:
   * **SSH (Port 22):** Allowed from your IP only.
   * **HTTP (Port 80):** Allowed from Anywhere (0.0.0.0/0).
   * **HTTPS (Port 443):** Allowed from Anywhere (0.0.0.0/0).

### Step 3.2: Server Configuration
1. SSH into the newly created instance:
   `ssh -i "your-key.pem" ubuntu@<EC2-PUBLIC-IP>`
2. Update packages and install Node.js:
   `sudo apt update && sudo apt install -y nodejs npm`
3. Install PM2 (Process Manager) globally to keep the app running in the background:
   `sudo npm install -g pm2`

### Step 3.3: Deploy the Code
1. Clone the repository or use SCP to transfer the `backend/` folder to the EC2 instance.
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Create a `.env` file in the backend root directory with the following variables:
   ```env
   PORT=5000
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   FINAL_JWT_SECRET=your_secure_random_string
   ADMIN_INITIAL_PASSWORD=YourSecureAdminPassword123
   ```
5. Start the backend application using PM2:
   `pm2 start index.js --name "costforge-api"`
6. Save the PM2 process list to restart on server reboot:
   `pm2 save`
   `pm2 startup`

### Step 3.4: Configure Nginx Reverse Proxy
To expose the Node.js app running on port 5000 to the public web on port 80:
1. Install Nginx: `sudo apt install -y nginx`
2. Edit the default configuration: `sudo nano /etc/nginx/sites-available/default`
3. Replace the `location /` block with:
   ```nginx
   location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }
   ```
4. Test and restart Nginx:
   `sudo nginx -t && sudo systemctl restart nginx`

---

## 4. Frontend Deployment (Amazon S3 + CloudFront)
The frontend is a React Single Page Application (SPA) compiled via Vite and served globally via CloudFront.

### Step 4.1: Build the Application
1. On your local machine, navigate to the frontend directory: `cd frontend`
2. Edit the `src/api/client.js` file to point to your new EC2 Public IP or Domain.
3. Install dependencies and build the production assets:
   `npm install`
   `npm run build`
   *(This generates a `dist/` folder containing the static HTML/CSS/JS).*

### Step 4.2: Configure Amazon S3
1. Navigate to the Amazon S3 Dashboard.
2. Click **Create bucket**. Name it uniquely (e.g., `costforge-frontend-prod`).
3. Under Object Ownership, leave ACLs disabled.
4. **Uncheck** "Block all public access" (or keep it checked and use CloudFront OAC for better security).
5. Upload the entire contents of your local `dist/` folder into the root of the S3 bucket.

### Step 4.3: Configure Amazon CloudFront
CloudFront provides caching, HTTPS termination, and global low-latency delivery.
1. Navigate to the CloudFront Dashboard and click **Create Distribution**.
2. **Origin domain:** Select your S3 bucket from the dropdown.
3. **Origin access:** Select "Origin access control settings (recommended)" and create a new control policy.
4. **Viewer protocol policy:** Select "Redirect HTTP to HTTPS".
5. **Web Application Firewall (WAF):** Disable for now to save costs.
6. **Default root object:** Type `index.html`.
7. Click **Create Distribution**.

### Step 4.4: S3 Bucket Policy Update
1. After CloudFront creation, AWS provides a bucket policy allowing CloudFront to read the S3 bucket.
2. Copy this policy, go back to your S3 Bucket -> Permissions -> Bucket Policy, and paste it.

### Step 4.5: Handling SPA Routing (React Router)
Because React handles routing client-side, CloudFront must be told to return `index.html` for any 404 errors so React can take over the URL.
1. Go to your CloudFront Distribution -> **Error pages**.
2. Click **Create custom error response**.
3. HTTP error code: `404: Not Found`
4. Customize error response: **Yes**
5. Response page path: `/index.html`
6. HTTP Response code: `200: OK`
7. Save changes.

---

## 5. Final Verification
1. Access the CloudFront Distribution Domain Name (e.g., `dji1sh2llkd41.cloudfront.net`) in your browser.
2. Verify that the login page loads correctly.
3. Login using the default Admin credentials.
4. Verify that the dashboard fetches data from the EC2 backend successfully.

**Deployment is now complete and fully operational on AWS.**
