import { djangoClient, getApiBaseURL } from './djangoApi'
import { getApiAccessToken } from '../utils/storage'
import { formatApiError } from '../utils/formatApiError'

/**
 * GET /api/results/?class_name=&exam_type=
 */
export async function fetchClassResults({ class_name, exam_type }) {
  const { data } = await djangoClient.get('/api/results/', {
    params: { class_name, exam_type },
  })
  return data
}

/**
 * GET /api/results/{studentId}/?exam_type=
 */
export async function fetchStudentResult(studentId, exam_type) {
  const { data } = await djangoClient.get(`/api/results/${studentId}/`, {
    params: { exam_type },
  })
  return data
}

/**
 * Download PDF (authenticated blob).
 */
async function blobErrorMessage(blob) {
  try {
    const text = await blob.text()
    const j = JSON.parse(text)
    if (j && typeof j.detail === 'string') return j.detail
    if (j && typeof j.detail === 'object') return JSON.stringify(j.detail)
    return text.slice(0, 300) || 'Request failed.'
  } catch {
    return 'Could not download PDF.'
  }
}

export async function downloadResultPdf(studentId, exam_type) {
  try {
    const res = await djangoClient.get(`/api/results/${studentId}/pdf/`, {
      params: { exam_type },
      responseType: 'blob',
    })
    const blob = res.data
    const ct = (res.headers['content-type'] || '').toLowerCase()
    if (ct.includes('application/json')) {
      throw new Error(await blobErrorMessage(blob))
    }
    const cd = res.headers['content-disposition'] || ''
    const m = /filename="([^"]+)"/.exec(cd)
    const filename = m ? m[1] : `report_${studentId}_${exam_type}.pdf`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    const data = err?.response?.data
    if (data instanceof Blob) {
      throw new Error((await blobErrorMessage(data)) || formatApiError(err))
    }
    throw err
  }
}

/**
 * POST /api/results/{studentId}/send/  body: { exam_type }
 */
export async function sendResultToParent(studentId, exam_type) {
  const { data } = await djangoClient.post(`/api/results/${studentId}/send/`, {
    exam_type,
  })
  return data
}

/**
 * Absolute URL to PDF (needs Bearer — use downloadResultPdf instead).
 */
export function getResultPdfApiUrl(studentId, exam_type) {
  const base = getApiBaseURL()
  const token = getApiAccessToken()
  const q = new URLSearchParams({ exam_type })
  const path = `${base}/api/results/${studentId}/pdf/?${q.toString()}`
  return { path, token }
}
