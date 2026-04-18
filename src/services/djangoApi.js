import axios from 'axios'
import {
  clearApiTokens,
  getApiAccessToken,
  getApiRefreshToken,
  setApiAccessToken,
} from '../utils/storage'

/**
 * API base URL:
 * - Dev (Vite): empty string → `/api/...` is proxied to Django (see vite.config.js).
 * - If VITE_API_URL is set → direct calls (needs CORS on Django).
 */
export function getApiBaseURL() {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (import.meta.env.DEV) return ''
  return 'http://127.0.0.1:8000'
}

export const djangoClient = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

djangoClient.interceptors.request.use((config) => {
  const token = getApiAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

djangoClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/token/')
    ) {
      return Promise.reject(error)
    }
    original._retry = true
    const refresh = getApiRefreshToken()
    if (!refresh) {
      clearApiTokens()
      return Promise.reject(error)
    }
    const base = getApiBaseURL()
    const refreshPath = base
      ? `${base}/api/auth/token/refresh/`
      : '/api/auth/token/refresh/'
    try {
      const { data } = await axios.post(refreshPath, { refresh })
      setApiAccessToken(data.access)
      original.headers.Authorization = `Bearer ${data.access}`
      return djangoClient(original)
    } catch {
      clearApiTokens()
      return Promise.reject(error)
    }
  }
)
