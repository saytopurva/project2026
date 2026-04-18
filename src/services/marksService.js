import { djangoClient } from './djangoApi'

export async function fetchMarks() {
  const { data } = await djangoClient.get('/api/marks/')
  return Array.isArray(data) ? data : []
}

export async function createMark(payload) {
  const { data } = await djangoClient.post('/api/add-marks/', payload)
  return data
}
