import axios from 'axios'
import { getApiBaseURL } from './djangoApi'

/**
 * No JWT interceptors — avoids sending a stale Bearer to /auth/register or /auth/token/.
 */
function bareClient() {
  return axios.create({
    baseURL: getApiBaseURL(),
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Register Django user (idempotent) + obtain JWT. Returns tokens (caller stores with rememberMe).
 */
export async function bootstrapDjangoJwt(email, password, name) {
  if (!email?.trim() || !password) {
    return { ok: false, error: 'Missing credentials for API login.' }
  }
  const cleanEmail = email.trim().toLowerCase()
  const client = bareClient()
  try {
    await client.post('/api/auth/register/', {
      email: cleanEmail,
      password,
      name: name || '',
    })
  } catch {
    /* user may already exist */
  }
  try {
    const { data } = await client.post('/api/auth/token/', {
      username: cleanEmail,
      password,
    })
    return {
      ok: true,
      access: data.access,
      refresh: data.refresh,
    }
  } catch (e) {
    const detail =
      e?.response?.data?.detail ||
      e?.response?.data?.non_field_errors?.[0] ||
      'Could not obtain API token. If you changed your app password, delete the Django user for this email in Admin or use the same password.'
    return { ok: false, error: String(detail) }
  }
}
