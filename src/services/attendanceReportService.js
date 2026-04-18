import { djangoClient } from './djangoApi'

export async function fetchMonthlyAttendanceReport(studentId, month, year) {
  const { data } = await djangoClient.get(`/api/attendance/report/${studentId}/`, {
    params: { month, year, format: 'json' },
  })
  return data
}

export function attendanceReportCsvUrl(studentId, month, year) {
  const base = djangoClient.defaults.baseURL || ''
  const q = new URLSearchParams({ month: String(month), year: String(year), format: 'csv' })
  return `${base}/api/attendance/report/${studentId}/?${q.toString()}`
}

/** Opens CSV download in a new tab (uses JWT cookie-less — use fetch+blob instead). */
export async function downloadAttendanceReportCsv(studentId, month, year) {
  const { data } = await djangoClient.get(`/api/attendance/report/${studentId}/`, {
    params: { month, year, format: 'csv' },
    responseType: 'blob',
  })
  const blob = new Blob([data], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_${studentId}_${year}_${String(month).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function sendReportToParent(studentId, month, year) {
  const { data } = await djangoClient.post(`/api/send-report/${studentId}/`, { month, year })
  return data
}
