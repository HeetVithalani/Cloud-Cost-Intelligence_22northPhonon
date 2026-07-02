const { iamClient, ListRolesCommand, ListAttachedRolePoliciesCommand, GetPolicyCommand, GetPolicyVersionCommand } = require('../config/awsClients')
const { region } = require('../config/awsClients')
const { getEC2Instances } = require('./ec2Service')
const { getLambdaFunctions } = require('./lambdaService')

async function getIAMRoles() {
  try {
    const roles = []; let marker = undefined
    do {
      const resp = await iamClient.send(new ListRolesCommand({ Marker: marker, MaxItems: 100 }))
      roles.push(...(resp.Roles || []))
      marker = resp.Marker
    } while (marker)
    const results = []
    for (const role of roles) {
      let policies = []; let isOverPrivileged = false
      try {
        const { AttachedPolicies } = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: role.RoleName }))
        for (const ap of (AttachedPolicies || [])) {
          let actions = []
          try {
            const { Policy } = await iamClient.send(new GetPolicyCommand({ PolicyArn: ap.PolicyArn }))
            const { PolicyVersion } = await iamClient.send(new GetPolicyVersionCommand({ PolicyArn: ap.PolicyArn, VersionId: Policy.DefaultVersionId }))
            const doc = JSON.parse(decodeURIComponent(PolicyVersion.Document))
            const stmts = Array.isArray(doc.Statement) ? doc.Statement : [doc.Statement]
            for (const s of stmts) {
              const acts = Array.isArray(s.Action) ? s.Action : [s.Action || '']
              actions.push(...acts)
              if (acts.some(a => a === '*' || a.endsWith(':*'))) isOverPrivileged = true
            }
          } catch {}
          policies.push({ policyName: ap.PolicyName, policyArn: ap.PolicyArn, type: ap.PolicyArn.includes('aws-policy') ? 'AWS Managed' : 'Customer Managed', actions })
        }
      } catch {}
      const services = new Set()
      if (role.AssumeRolePolicyDocument) {
        try {
          const doc = JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument))
          for (const s of (doc.Statement || [])) {
            const princ = s.Principal?.Service
            if (princ) { const svcs = Array.isArray(princ) ? princ : [princ]; svcs.forEach(s => services.add(s.split('.')[0])) }
          }
        } catch {}
      }
      results.push({ id: role.RoleName, roleName: role.RoleName, services: [...services], isOverPrivileged, resourceCount: 0, lastActivity: role.RoleLastUsed?.LastUsedDate, createDate: role.CreateDate })
    }
    return results
  } catch (e) { throw new Error(`IAM error: ${e.message}`) }
}

async function getResourcesByRole(roleName) {
  try {
    const resources = []
    try {
      const instances = await getEC2Instances({})
      for (const i of instances) { if (i.iamRole === roleName) resources.push({ ...i, name: i.name || i.instanceId, serviceType: 'EC2', status: i.state }) }
    } catch {}
    try {
      const fns = await getLambdaFunctions()
      for (const f of fns) { if (f.role?.includes(roleName)) resources.push({ id: f.functionName, name: f.functionName, serviceType: 'Lambda', status: 'running', region, costPerMonth: f.costPerMonth }) }
    } catch {}
    return resources
  } catch (e) { throw new Error(`Resources by role error: ${e.message}`) }
}

module.exports = { getIAMRoles, getResourcesByRole }
