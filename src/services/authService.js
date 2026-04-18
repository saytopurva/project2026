import apiClient from './apiClient'

/**
 * Email/password step — returns user draft for OTP (via mock Axios).
 */
export async function loginWithEmailApi({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data.user
}

/** Verify 6-digit OTP against mock API. */
export async function verifyOtpApi(otp) {
  const { data } = await apiClient.post('/auth/verify-otp', { otp })
  return data
}

/** Mock resend — resets client-side timer only; same static OTP applies. */
export async function resendOtpApi() {
  const { data } = await apiClient.post('/auth/resend-otp', {})
  return data
}
