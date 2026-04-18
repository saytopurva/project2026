import { djangoClient } from './djangoApi'

/** GET /api/attendance/analytics/?class_name=&month=&year= */
export async function fetchAttendanceAnalytics({ class_name, month, year }) {
  const { data } = await djangoClient.get('/api/attendance/analytics/', {
    params: { class_name, month, year },
  })
  return data
}

/** GET /api/attendance/ — filters: student, month, status, class, start, end, search */
export async function fetchAttendanceList(params = {}) {
  const { data } = await djangoClient.get('/api/attendance/', { params })
  return Array.isArray(data) ? data : []
}

/** GET /api/attendance/student/:id/ */
export async function fetchAttendanceByStudent(studentId, params = {}) {
  const { data } = await djangoClient.get(`/api/attendance/student/${studentId}/`, { params })
  return data
}

/** GET /api/attendance/summary/:id/?month=&year= */
export async function fetchAttendanceSummary(studentId, month, year) {
  const { data } = await djangoClient.get(`/api/attendance/summary/${studentId}/`, {
    params: { month, year },
  })
  return data
}

/** POST /api/attendance/ */
export async function createAttendance(payload) {
  const { data } = await djangoClient.post('/api/attendance/', payload)
  return data
}

/** PATCH /api/attendance/:id/ */
export async function updateAttendance(id, payload) {
  const { data } = await djangoClient.patch(`/api/attendance/${id}/`, payload)
  return data
}

export async function deleteAttendance(id) {
  await djangoClient.delete(`/api/attendance/${id}/`)
}

/** POST /api/attendance/bulk/ — entries: [{ student, status, reason }] */
export async function bulkAttendance(payload) {
  const { data } = await djangoClient.post('/api/attendance/bulk/', payload)
  return data
}

export async function downloadAttendanceCsv(params = {}) {
  const { data } = await djangoClient.get('/api/attendance/export/', {
    params,
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'attendance.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}
