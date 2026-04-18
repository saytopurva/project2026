import axios from 'axios'
import { DASHBOARD_OVERVIEW_MOCK } from '../data/dashboardMockData'
import { MOCK_DELAY_MS, MOCK_OTP } from '../utils/constants'

/**
 * Axios instance aimed at a future real API. For now a custom adapter
 * returns mock JSON so we still exercise Axios (interceptors, errors, etc.).
 */
function mockDelay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Minimal mock "backend" — swap this adapter for real HTTP when your API exists.
 */
async function mockAdapter(config) {
  await mockDelay()
  const method = (config.method || 'get').toLowerCase()
  const url = String(config.url || '').replace(/^\/api/, '') || '/'

  let body = {}
  if (config.data) {
    if (typeof config.data === 'string') {
      try {
        body = JSON.parse(config.data)
      } catch {
        body = {}
      }
    } else {
      body = config.data
    }
  }

  /** Shape Axios expects */
  const ok = (data, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  })

  const fail = (message, status = 400) => {
    const err = new Error(message)
    err.response = { data: { message }, status, config }
    return Promise.reject(err)
  }

  if (method === 'post' && url === '/auth/login') {
    const { email, password } = body
    if (!email?.trim() || !password) {
      return fail('Email and password are required.', 422)
    }
    const local = email.split('@')[0] || 'Student'
    return ok({
      user: {
        email: email.trim(),
        name: local.charAt(0).toUpperCase() + local.slice(1),
        provider: 'password',
      },
    })
  }

  if (method === 'post' && url === '/auth/verify-otp') {
    const code = String(body.otp || '').trim()
    if (!code) return fail('Please enter the 6-digit code.', 422)
    if (code.length !== 6) return fail('Code must be 6 digits.', 422)
    if (code !== MOCK_OTP) {
      return fail('Invalid verification code.', 401)
    }
    return ok({ verified: true })
  }

  if (method === 'post' && url === '/auth/resend-otp') {
    return ok({ sent: true, message: 'A new code has been sent (demo: static OTP).' })
  }

  if (method === 'get' && url === '/dashboard/stats') {
    return ok({
      totalStudents: DASHBOARD_OVERVIEW_MOCK.totalStudents,
      attendancePercent: DASHBOARD_OVERVIEW_MOCK.attendancePercent,
      averageMarks: DASHBOARD_OVERVIEW_MOCK.averageMarks,
    })
  }

  if (method === 'get' && url === '/dashboard/overview') {
    return ok(DASHBOARD_OVERVIEW_MOCK)
  }

  return fail(`Mock API: no handler for ${method} ${url}`, 404)
}

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  adapter: mockAdapter,
})

export default apiClient
