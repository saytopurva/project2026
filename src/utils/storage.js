/**
 * Browser persistence helpers for auth (localStorage vs sessionStorage).
 * "Remember me" uses localStorage; otherwise session ends when the tab session ends.
 * JWT tokens use the *same* storage as the user session so they stay in sync.
 */

const KEY_AUTH = 'sms_auth'
const KEY_OTP_PENDING = 'sms_otp_pending'
const KEY_REMEMBER_FLAG = 'sms_remember_me'
const KEY_API_SESSION_PW = 'sms_api_session_password'
const KEY_JWT_ACCESS = 'sms_jwt_access'
const KEY_JWT_REFRESH = 'sms_jwt_refresh'

/** Password used once after OTP to register/obtain Django JWT (email login = real password; Google = random). */
export function setApiSessionPassword(password) {
  if (password) sessionStorage.setItem(KEY_API_SESSION_PW, password)
}

export function getApiSessionPassword() {
  return sessionStorage.getItem(KEY_API_SESSION_PW)
}

export function clearApiSessionPassword() {
  sessionStorage.removeItem(KEY_API_SESSION_PW)
}

function tokenStorage() {
  if (sessionStorage.getItem(KEY_JWT_REFRESH) || sessionStorage.getItem(KEY_JWT_ACCESS)) {
    return sessionStorage
  }
  return localStorage
}

export function setApiTokens(access, refresh, rememberMe = true) {
  clearApiTokens()
  const storage = rememberMe ? localStorage : sessionStorage
  if (access) storage.setItem(KEY_JWT_ACCESS, access)
  if (refresh) storage.setItem(KEY_JWT_REFRESH, refresh)
}

export function getApiAccessToken() {
  return (
    sessionStorage.getItem(KEY_JWT_ACCESS) ||
    localStorage.getItem(KEY_JWT_ACCESS)
  )
}

export function getApiRefreshToken() {
  return (
    sessionStorage.getItem(KEY_JWT_REFRESH) ||
    localStorage.getItem(KEY_JWT_REFRESH)
  )
}

/** After refresh, write access token next to the existing refresh token. */
export function setApiAccessToken(access) {
  const storage = tokenStorage()
  if (access) storage.setItem(KEY_JWT_ACCESS, access)
}

export function clearApiTokens() {
  sessionStorage.removeItem(KEY_JWT_ACCESS)
  sessionStorage.removeItem(KEY_JWT_REFRESH)
  localStorage.removeItem(KEY_JWT_ACCESS)
  localStorage.removeItem(KEY_JWT_REFRESH)
}

export function readPersistedUser() {
  const raw =
    sessionStorage.getItem(KEY_AUTH) || localStorage.getItem(KEY_AUTH)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.user ?? null
  } catch {
    return null
  }
}

export function readOtpPendingUser() {
  const raw = sessionStorage.getItem(KEY_OTP_PENDING)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeOtpPendingUser(userDraft) {
  if (userDraft) {
    sessionStorage.setItem(KEY_OTP_PENDING, JSON.stringify(userDraft))
  } else {
    sessionStorage.removeItem(KEY_OTP_PENDING)
  }
}

/** Remember-me intent for the in-progress login (set before OTP). */
export function setRememberMeIntent(flag) {
  sessionStorage.setItem(KEY_REMEMBER_FLAG, flag ? '1' : '0')
}

export function consumeRememberMeIntent() {
  const v = sessionStorage.getItem(KEY_REMEMBER_FLAG)
  sessionStorage.removeItem(KEY_REMEMBER_FLAG)
  return v === '1'
}

export function persistAuthenticatedUser(user, rememberMe) {
  const payload = JSON.stringify({ user })
  sessionStorage.removeItem(KEY_AUTH)
  localStorage.removeItem(KEY_AUTH)
  if (rememberMe) {
    localStorage.setItem(KEY_AUTH, payload)
  } else {
    sessionStorage.setItem(KEY_AUTH, payload)
  }
}

export function clearAllAuthStorage() {
  sessionStorage.removeItem(KEY_AUTH)
  sessionStorage.removeItem(KEY_OTP_PENDING)
  sessionStorage.removeItem(KEY_REMEMBER_FLAG)
  sessionStorage.removeItem(KEY_API_SESSION_PW)
  localStorage.removeItem(KEY_AUTH)
  clearApiTokens()
}
