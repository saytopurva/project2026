import { djangoClient } from './djangoApi'

/**
 * Legacy KPI-only payload (kept for backward compatibility).
 */
export async function fetchDashboardStats() {
  const { data } = await djangoClient.get('/api/dashboard/stats/')
  return data
}

/**
 * Full dashboard: stats, chart series, activity, students list.
 */
export async function fetchDashboardOverview() {
  const { data } = await djangoClient.get('/api/dashboard/overview/')
  return data
}
