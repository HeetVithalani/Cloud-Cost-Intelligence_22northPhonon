import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'

// NOTE: baseURL in client.js is already "/api".
// All paths here must start with the route suffix only (e.g. "/dashboard/..." not "/api/dashboard/...").

export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: () => apiClient.get('/dashboard/summary').then(r => r.data.data), refetchInterval: 30000, retry: 1 })
export const useEC2 = (filters) => useQuery({ queryKey: ['ec2', filters], queryFn: () => apiClient.get('/resources/ec2', { params: filters }).then(r => r.data.data), enabled: filters !== undefined, retry: 1 })
export const useEC2Detail = (id) => useQuery({ queryKey: ['ec2', id], queryFn: () => apiClient.get(`/resources/ec2/${id}`).then(r => r.data.data), enabled: !!id, retry: 1 })
export const useS3 = () => useQuery({ queryKey: ['s3'], queryFn: () => apiClient.get('/resources/s3').then(r => r.data.data), retry: 1 })
export const useRDS = () => useQuery({ queryKey: ['rds'], queryFn: () => apiClient.get('/resources/rds').then(r => r.data.data), retry: 1 })
export const useLambdaFns = () => useQuery({ queryKey: ['lambda'], queryFn: () => apiClient.get('/resources/lambda').then(r => r.data.data), retry: 1 })
export const useIAM = () => useQuery({ queryKey: ['iam'], queryFn: () => apiClient.get('/iam/roles').then(r => r.data.data), retry: 1 })
export const useIAMResources = (roleName) => useQuery({ queryKey: ['iam-resources', roleName], queryFn: () => apiClient.get(`/iam/resources-by-role/${encodeURIComponent(roleName)}`).then(r => r.data.data), enabled: !!roleName, retry: 1 })
export const useCosts = (period) => useQuery({ queryKey: ['costs', period], queryFn: () => apiClient.get('/costs/summary', { params: { period } }).then(r => r.data.data), retry: 1 })
export const useCostTrend = (days) => useQuery({ queryKey: ['cost-trend', days], queryFn: () => apiClient.get('/costs/trend', { params: { days } }).then(r => r.data.data), retry: 1 })
export const useCostByRole = () => useQuery({ queryKey: ['cost-by-role'], queryFn: () => apiClient.get('/costs/by-role').then(r => r.data.data), retry: 1 })
export const useAlarms = () => useQuery({ queryKey: ['alarms'], queryFn: () => apiClient.get('/cloudwatch/alarms').then(r => r.data.data), refetchInterval: 30000, retry: 1 })
export const useMetric = (params) => useQuery({ queryKey: ['metric', params], queryFn: () => apiClient.get('/cloudwatch/metric', { params }).then(r => r.data.data), enabled: !!params?.namespace, retry: 1 })
export const useLogGroups = () => useQuery({ queryKey: ['log-groups'], queryFn: () => apiClient.get('/cloudwatch/logs/groups').then(r => r.data.data), retry: 1 })
export const useAdvisor = () => useQuery({ queryKey: ['advisor'], queryFn: () => apiClient.get('/advisor/checks').then(r => r.data.data), retry: 1 })
export const useAlerts = (filters) => useQuery({ queryKey: ['alerts', filters], queryFn: () => apiClient.get('/alerts', { params: filters }).then(r => r.data.data), refetchInterval: 15000, retry: 1 })
export const useReports = () => useQuery({ queryKey: ['reports'], queryFn: () => apiClient.get('/reports/list').then(r => r.data.data), retry: 1 })

// Admin queries
export const useAdminUsers = () => useQuery({ queryKey: ['admin-users'], queryFn: () => apiClient.get('/admin/users').then(r => r.data.data), retry: 1 })
export const useAdminLogs = (filters) => useQuery({ queryKey: ['admin-logs', filters], queryFn: () => apiClient.get('/admin/logs', { params: filters }).then(r => r.data.data), retry: 1, refetchInterval: 30000 })

// Central sample data fallback — used when live AWS data is empty
export const useSampleData = () => useQuery({ queryKey: ['sample-data'], queryFn: () => apiClient.get('/sample-data').then(r => r.data.data), retry: 1, staleTime: 60000 })

// ── Costing pages — now using dedicated /api/costing/* endpoints ──
export const useRoleCosts = () => useQuery({ queryKey: ['role-costs'], queryFn: () => apiClient.get('/costing/roles').then(r => r.data.data), retry: 1 })
export const useRoleCostDetail = (roleName) => useQuery({ queryKey: ['role-cost-detail', roleName], queryFn: () => apiClient.get(`/costing/roles/${encodeURIComponent(roleName)}`).then(r => r.data.data), enabled: !!roleName, retry: 1 })
export const useUserCostMetrics = () => useQuery({ queryKey: ['user-cost-metrics'], queryFn: () => apiClient.get('/costing/users').then(r => r.data.data), retry: 1 })
export const useUserCostDetail = (userId) => useQuery({ queryKey: ['user-cost-detail', userId], queryFn: () => apiClient.get(`/costing/users/${encodeURIComponent(userId)}`).then(r => r.data.data), enabled: !!userId, retry: 1 })
export const useApiCostMetrics = () => useQuery({ queryKey: ['api-cost-metrics'], queryFn: () => apiClient.get('/costing/apis').then(r => r.data.data), retry: 1 })
