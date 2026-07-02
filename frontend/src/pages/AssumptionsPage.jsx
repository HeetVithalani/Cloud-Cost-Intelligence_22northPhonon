const ASSUMPTIONS = [
  { title: 'Sample Data Usage', desc: 'No live AWS integration is required for the hackathon. The dashboard combines real AWS SDK calls (when credentials are configured) with realistic mock data from MOCK_COST_TREND, MOCK_SERVICE_BREAKDOWN, and MOCK_SAVINGS_RECOMMENDATIONS for demonstration purposes.' },
  { title: 'SaaS Company Profile', desc: 'Assumed a mid-size SaaS company with 50–200 EC2 instances, 10–30 RDS databases, 20–50 Lambda functions, and $15,000–$30,000 monthly AWS spend across us-east-1 as primary region.' },
  { title: 'Cost Data Accuracy', desc: 'Cost figures are pulled from AWS Cost Explorer API (MTD and forecasted). Where unavailable, the system displays mock data derived from AWS public pricing for common instance types.' },
  { title: 'IAM Role Tagging', desc: 'Assumed resources are tagged with IAM role identifiers. The cost-by-role breakdown requires the iamrole tag to be applied to EC2, RDS, and Lambda resources in the AWS account.' },
  { title: 'DynamoDB Free Tier', desc: 'All application data (users, alerts, cache, reports, activity logs) is stored in DynamoDB using PAY_PER_REQUEST billing mode. Within AWS Free Tier for small usage.' },
  { title: 'Savings Recommendations', desc: 'Recommendations are generated using rule-based analysis (CPU <20% → downsize, On-Demand running 24/7 → Reserved Instance, unattached volumes → delete). Production version would use ML-based anomaly detection.' },
  { title: 'Multi-Region Support', desc: 'The UI exposes a region selector for us-east-1, us-west-2, ap-south-1, eu-west-1. AWS SDK clients are configured per-region. Cost Explorer always uses us-east-1 (AWS requirement).' },
  { title: 'Trusted Advisor', desc: 'Trusted Advisor checks require AWS Business Support or Enterprise Support plan. If unavailable, the page gracefully shows empty state without breaking the app.' },
  { title: 'SES Email Delivery', desc: 'OTP delivery requires SES to be out of sandbox mode and the sender email domain verified. In development, OTP is logged to server console for testing.' },
  { title: 'Security Model', desc: 'JWT tokens are stored in HttpOnly cookies (not localStorage) to prevent XSS. Rate limiting is applied on all auth endpoints. CORS is restricted to the configured FRONTEND_URL.' },
  { title: '48-Hour Build Window', desc: 'This project was built within a 48-hour hackathon window starting from scratch. The architecture prioritises working MVP over production-grade scalability.' },
  { title: 'Customer Journey', desc: 'Onboarding flow: Register → Dashboard Overview → Cost Analysis → Savings Recommendations → Infrastructure Analysis → Generate Report. The Demo Mode button in the header highlights this path for judges.' },
]

export default function AssumptionsPage() {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Key Assumptions</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Design decisions and constraints for the CloudSense hackathon submission</p>
      </div>

      {/* Summary */}
      <div className="card no-hover" style={{ marginBottom: 24, padding: '18px 22px', borderLeft: '4px solid var(--accent)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--accent)' }}>📋 Hackathon Context — Challenge 5: Cloud Cost Intelligence</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          CloudSense is a cloud cost intelligence platform designed for rapidly growing SaaS companies. It analyses infrastructure usage across EC2, RDS, Lambda, and S3, then surfaces actionable savings recommendations with estimated monthly impact. Built as a complete working MVP within a 48-hour window.
        </div>
      </div>

      {/* Assumptions list */}
      <div className="card no-hover" style={{ padding: 0, overflow: 'hidden' }}>
        {ASSUMPTIONS.map((a, i) => (
          <div key={i} className="assumption-item">
            <div className="assumption-num">{i + 1}</div>
            <div>
              <div className="assumption-title">{a.title}</div>
              <div className="assumption-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Demo mode CTA */}
      <div className="card no-hover" style={{ marginTop: 24, padding: '18px 22px', textAlign: 'center', borderTop: '4px solid var(--accent-amber)', background: 'rgba(245,158,11,0.05)' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>🎬</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 6 }}>5-Minute Judge Walkthrough</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Click <strong style={{ color: 'var(--accent-amber)' }}>Demo Mode</strong> in the top bar to activate the judge walkthrough.
          Recommended path: <strong>Overview</strong> → <strong>Cost &amp; FinOps</strong> → <strong>Savings</strong> → <strong>Infrastructure Analysis</strong> → <strong>API Docs</strong>
        </div>
      </div>
    </div>
  )
}
