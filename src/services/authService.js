import axios from 'axios'
import { djangoClient, getApiBaseURL } from './djangoApi'

/**
 * Public auth API (no Bearer) — email OTP exchange for JWT.
 */
const publicClient = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * POST /api/auth/send-otp/
 * @param {string} email
 */
export async function sendOtpRequest(email) {
  const { data } = await publicClient.post('/api/auth/send-otp/', { email })
  return data
}

/**
 * POST /api/auth/verify-otp/
 * @returns {{ access: string, refresh: string, user: { id: number, email: string, name: string } }}
 */
export async function verifyOtpRequest(email, otp) {
  const { data } = await publicClient.post('/api/auth/verify-otp/', {
    email,
    otp: String(otp).trim(),
  })
  return data
}

/**
 * POST /api/auth/google-login/ — Google Identity Services ID token.
 * @param {string} idToken — JWT from credential.credential
 */
export async function googleLoginRequest(idToken) {
  const { data } = await publicClient.post('/api/auth/google-login/', {
    token: idToken,
  })
  return data
}

/**
 * Blacklist all refresh tokens for the current user (sign out everywhere).
 */
export async function logoutAllDevicesRequest() {
  const { data } = await djangoClient.post('/api/auth/logout-all/')
  return data
}
