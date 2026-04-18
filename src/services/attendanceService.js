import { djangoClient } from './djangoApi'

/** GET /api/attendance/ — optional params: student, start, end, month, status, class */
export async function fetchAttendanceList(params = {}) {
  const { data } = await djangoClient.get('/api/attendance/', { params })
  return Array.isArray(data) ? data : []
}

/** GET /api/attendance/student/:id/ — returns { results, count, attendance_percentage } */
export async function fetchAttendanceByStudent(studentId, params = {}) {
  const { data } = await djangoClient.get(`/api/attendance/student/${studentId}/`, { params })
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

/** DELETE /api/attendance/:id/ */
export async function deleteAttendance(id) {
  await djangoClient.delete(`/api/attendance/${id}/`)
}

/** POST /api/attendance/bulk/ — { date, entries: [{ student, status, leave_reason? }] } */
export async function bulkAttendance(payload) {
  const { data } = await djangoClient.post('/api/attendance/bulk/', payload)
  return data
}

/** GET /api/attendance/export/ — CSV download */
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
