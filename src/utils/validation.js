import { PASSWORD_MIN_LENGTH } from './constants'

/**
 * Basic email format check for login forms.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const trimmed = email.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function emailErrorMessage(email) {
  if (!email || !String(email).trim()) return 'Email is required.'
  if (!isValidEmail(email)) return 'Please enter a valid email address.'
  return null
}

/**
 * Password: required + minimum length (see constants).
 */
export function passwordErrorMessage(password) {
  if (!password || !String(password).trim()) return 'Password is required.'
  if (String(password).length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  return null
}
