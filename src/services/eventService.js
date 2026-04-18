import { djangoClient } from './djangoApi'

/**
 * GET /api/events/
 * Optional filters:
 * - search: string
 * - start: 'YYYY-MM-DD'
 * - end: 'YYYY-MM-DD'
 * - type: 'EVENT' | 'PTM' | 'HOLIDAY' | 'EXAM'
 */
export async function fetchEvents({ search = '', start = '', end = '', type = '' } = {}) {
  const params = new URLSearchParams()
  const q = String(search || '').trim()
  if (q) params.set('search', q)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (type) params.set('type', type)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const { data } = await djangoClient.get(`/api/events/${suffix}`)
  return Array.isArray(data) ? data : []
}

/** POST /api/events/ */
export async function createEvent(payload) {
  const { data } = await djangoClient.post('/api/events/', payload)
  return data
}

/** DELETE /api/events/{id}/ — server allows only the creator. */
export async function deleteEvent(id) {
  await djangoClient.delete(`/api/events/${id}/`)
}

