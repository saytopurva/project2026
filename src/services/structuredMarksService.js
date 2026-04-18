import { djangoClient } from './djangoApi'

function notifyMarksUpdated() {
  window.dispatchEvent(new CustomEvent('marks:updated'))
}

/** Predefined subjects (read-only on server). */
export async function fetchSubjects() {
  const { data } = await djangoClient.get('/api/subjects/')
  return Array.isArray(data) ? data : []
}

/** @returns {Promise<Array<{id:number,slug:string,name:string}>>} */
export async function fetchExamTypes() {
  const { data } = await djangoClient.get('/api/exam-types/')
  return Array.isArray(data) ? data : []
}

/**
 * GET /api/marks/distribution/
 * Class-wise subject aggregates with pass/fail % (40% threshold).
 * @param {{ class_name: string, exam_type: string }} params
 */
export async function fetchMarksDistribution(params) {
  const { data } = await djangoClient.get('/api/marks/distribution/', { params })
  return data
}

/**
 * @returns {Promise<{ results: object[], summary: object }>}
 */
export async function fetchMarksByStudent(studentId, { examType } = {}) {
  const params = {}
  if (examType) params.exam_type = examType
  const { data } = await djangoClient.get(`/api/marks/student/${studentId}/`, { params })
  return data
}

/** All structured mark rows (optional student filter). */
export async function fetchAllMarks(studentId) {
  const params = studentId ? { student: studentId } : {}
  const { data } = await djangoClient.get('/api/marks/', { params })
  return Array.isArray(data) ? data : []
}

export async function createStructuredMark(payload) {
  const { data } = await djangoClient.post('/api/marks/', payload)
  notifyMarksUpdated()
  return data
}

export async function updateStructuredMark(id, payload) {
  const { data } = await djangoClient.put(`/api/marks/${id}/`, payload)
  notifyMarksUpdated()
  return data
}

export async function deleteStructuredMark(id) {
  await djangoClient.delete(`/api/marks/${id}/`)
  notifyMarksUpdated()
}
