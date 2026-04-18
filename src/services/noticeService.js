import { djangoClient } from './djangoApi'

/**
 * GET /api/notices/ — optional `search`, `importantOnly` (maps to ?important=1).
 * Results are newest-first from the server.
 */
export async function fetchNotices({ search = '', importantOnly = false } = {}) {
  const params = new URLSearchParams()
  const q = search.trim()
  if (q) params.set('search', q)
  if (importantOnly) params.set('important', '1')
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const { data } = await djangoClient.get(`/api/notices/${suffix}`)
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/notices/ — JSON or multipart when `attachment` is a non-empty File.
 */
export async function createNotice({ title, content, isImportant, attachment }) {
  const hasFile = attachment instanceof File && attachment.size > 0
  if (hasFile) {
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('content', content.trim())
    fd.append('is_important', isImportant ? 'true' : 'false')
    fd.append('attachment', attachment)
    const { data } = await djangoClient.post('/api/notices/', fd, {
      transformRequest: [
        (body, headers) => {
          if (headers?.delete) headers.delete('Content-Type')
          else if (headers) delete headers['Content-Type']
          return body
        },
      ],
    })
    return data
  }
  const { data } = await djangoClient.post('/api/notices/', {
    title: title.trim(),
    content: content.trim(),
    is_important: Boolean(isImportant),
  })
  return data
}

/** DELETE /api/notices/{id}/ — server allows only the creator. */
export async function deleteNotice(id) {
  await djangoClient.delete(`/api/notices/${id}/`)
}
