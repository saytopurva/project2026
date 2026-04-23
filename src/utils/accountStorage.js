/**
 * Saved accounts on this browser (no tokens).
 * @typedef {{ email: string, name: string, picture?: string, provider?: 'google' | 'otp' }} SavedAccount
 */

const KEY = 'sms_saved_accounts'

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { accounts: [] }
    const parsed = JSON.parse(raw)
    const accounts = Array.isArray(parsed?.accounts) ? parsed.accounts : []
    return { accounts }
  } catch {
    return { accounts: [] }
  }
}

function writeRaw(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

/** @returns {SavedAccount[]} */
export function listSavedAccounts() {
  const { accounts } = readRaw()
  const seen = new Set()
  const out = []
  for (const a of accounts) {
    const email = String(a?.email || '')
      .trim()
      .toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    out.push({
      email,
      name: String(a?.name || email.split('@')[0] || 'User').trim() || 'User',
      ...(a?.picture ? { picture: String(a.picture) } : {}),
      ...(a?.provider ? { provider: a.provider === 'google' ? 'google' : 'otp' } : {}),
    })
  }
  return out
}

/** Upsert by email (merges picture/name; same email = one row for OTP + Google). */
export function upsertSavedAccount(account) {
  const email = String(account?.email || '')
    .trim()
    .toLowerCase()
  if (!email) return
  const name = String(account?.name || email.split('@')[0] || 'User').trim() || 'User'
  const prev = listSavedAccounts().find((a) => a.email === email)
  const picture =
    account?.picture ||
    prev?.picture ||
    ''
  const provider = account?.provider || prev?.provider
  const rest = listSavedAccounts().filter((a) => a.email !== email)
  const row = { email, name }
  if (picture) row.picture = picture
  if (provider) row.provider = provider
  writeRaw({ accounts: [...rest, row] })
}

export function removeSavedAccount(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase()
  writeRaw({
    accounts: listSavedAccounts().filter((a) => a.email !== e),
  })
}
