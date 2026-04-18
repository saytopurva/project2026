import { djangoClient } from './djangoApi'

/** GET /api/students/ */
export async function fetchStudents() {
  const { data } = await djangoClient.get('/api/students/')
  return Array.isArray(data) ? data : []
}

/** GET /api/students/:id/ */
export async function fetchStudentById(id) {
  const { data } = await djangoClient.get(`/api/students/${id}/`)
  return data
}

/** PATCH /api/students/:id/ (supports nested parents/academic/fees + photo multipart) */
export async function updateStudent(id, payload) {
  // If payload includes a File, send multipart
  const hasFile =
    payload &&
    typeof payload === 'object' &&
    Object.values(payload).some((v) => v instanceof File)

  if (!hasFile) {
    const { data } = await djangoClient.patch(`/api/students/${id}/`, payload)
    return data
  }

  const fd = new FormData()
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined) continue
    if (v === null) {
      fd.append(k, '')
      continue
    }
    if (v instanceof File) {
      fd.append(k, v)
      continue
    }
    if (typeof v === 'object') {
      fd.append(k, JSON.stringify(v))
      continue
    }
    fd.append(k, String(v))
  }
  const { data } = await djangoClient.patch(`/api/students/${id}/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** POST /api/students/:id/certificates/ (multipart) */
export async function uploadCertificate(studentId, { title, year, file }) {
  const fd = new FormData()
  fd.append('title', title || '')
  if (year !== undefined && year !== null && String(year).trim() !== '') fd.append('year', String(year))
  if (file) fd.append('file', file)
  const { data } = await djangoClient.post(`/api/students/${studentId}/certificates/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/** DELETE /api/certificates/:id/ */
export async function deleteCertificate(certificateId) {
  await djangoClient.delete(`/api/certificates/${certificateId}/`)
  return true
}

/** POST /api/add-student/ — body matches Django Student model */
export async function createStudent(payload) {
  const { data } = await djangoClient.post('/api/add-student/', payload)
  return data
}
