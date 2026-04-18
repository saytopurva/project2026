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
    return 'Cannot reach the Django API (bad gateway). Start the backend on port 8000 — from the project root run: bash scripts/run-backend.sh  (or npm run dev:django, or npm run dev:stack to run Vite + Django together).'
  }
  const d = err?.response?.data
  if (d == null) return err?.message || 'Request failed.'
  if (typeof d === 'string') return d
  if (d.detail != null) return typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail)
  if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) return d.non_field_errors.join(' ')
  if (typeof d === 'object') {
    const parts = Object.entries(d).map(([k, v]) => {
      const msg = Array.isArray(v) ? v.join(', ') : String(v)
      return k === 'non_field_errors' ? msg : `${k}: ${msg}`
    })
    return parts.join(' ') || JSON.stringify(d)
  }
  return err?.message || 'Request failed.'
}
