/**
 * Unwrap DRF / serializer values: strings, arrays, or { string, code } (ErrorDetail JSON).
 */
function drfValueToString(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    return v.map(drfValueToString).filter(Boolean).join(' ')
  }
  if (typeof v === 'object') {
    if (typeof v.string === 'string') return v.string
    if (typeof v.detail === 'string') return v.detail
    if (typeof v.message === 'string') return v.message
  }
  return ''
}

/** Turn DRF / axios error payloads into a short user-facing string. */
export function formatApiError(err) {
  if (err && !err.response) {
    const code = err.code
    const msg = String(err.message || '')
    if (
      code === 'ERR_NETWORK' ||
      code === 'ECONNREFUSED' ||
      msg === 'Network Error'
    ) {
      return 'Cannot reach the API. Start Django on port 8000 (run npm run dev:stack, or npm run dev + npm run dev:django in two terminals).'
    }
    if (code === 'ECONNABORTED') {
      return 'Request timed out. Check your connection and that the API is running.'
    }
  }
  const status = err?.response?.status
  // Vite’s proxy returns 502 when nothing is listening on the Django port (127.0.0.1:8000).
  if (status === 502 || status === 503 || status === 504) {
    return 'Cannot reach the Django API (bad gateway). From the project root run: npm run dev  (starts API + frontend), or in two terminals: npm run dev:django  then  npm run dev:client'
  }
  const d = err?.response?.data
  if (d == null) return err?.message || 'Request failed.'
  if (typeof d === 'string') return d
  if (d.detail != null) {
    if (typeof d.detail === 'string') return d.detail
    if (Array.isArray(d.detail)) return drfValueToString(d.detail)
    return drfValueToString(d.detail)
  }
  if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) {
    return drfValueToString(d.non_field_errors)
  }
  if (typeof d === 'object' && !Array.isArray(d)) {
    const parts = []
    for (const [k, v] of Object.entries(d)) {
      if (k === 'detail') continue
      const msg = drfValueToString(v)
      if (!msg) continue
      if (k === 'non_field_errors') {
        parts.push(msg)
      } else {
        const label = k.replace(/_/g, ' ')
        parts.push(`${label}: ${msg}`)
      }
    }
    if (parts.length) return parts.join(' ')
  }
  return err?.message || 'Request failed.'
}
