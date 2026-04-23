import { djangoClient } from './djangoApi'

/** GET /api/users/pending/ */
export async function fetchPendingUsers() {
  const { data } = await djangoClient.get('/api/users/pending/')
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/users/create-user/
 * @param {{ name: string, email: string, role: string, assigned_class?: string, assigned_subject?: number|null, password?: string }} body
 */
export function createSchoolUser(body) {
  return djangoClient.post('/api/users/create-user/', body)
}

/**
 * POST /api/users/:id/approve/
 * @param {number} userId
 * @param {{ role: string, assigned_class?: string, assigned_subject?: number|null }} body
 */
export function approveUser(userId, body) {
  return djangoClient.post(`/api/users/${userId}/approve/`, body)
}

/** POST /api/users/:id/reject/ */
export function rejectUser(userId, reason = '') {
  return djangoClient.post(`/api/users/${userId}/reject/`, { reason })
}

/** PATCH /api/users/:id/profile/ */
export function updateUserProfile(userId, body) {
  return djangoClient.patch(`/api/users/${userId}/profile/`, body)
}
