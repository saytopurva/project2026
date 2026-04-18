import { djangoClient } from './djangoApi'

/**
 * GET /api/me/ — staff role + scope (RBAC).
 * @returns {Promise<{ data: Record<string, unknown> }>}
 */
export function fetchCurrentUserMe() {
  return djangoClient.get('/api/me/')
}
