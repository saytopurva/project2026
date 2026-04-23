import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUserMe } from '../services/meApi'
import { upsertSavedAccount } from '../utils/accountStorage'
import { logoutAllDevicesRequest } from '../services/authService'
import {
  clearAllAuthStorage,
  getApiAccessToken,
  isRememberMeSession,
  persistAuthenticatedUser,
  readPersistedUser,
  setApiTokens,
} from '../utils/storage'
import { AuthContext } from './authContext'

/** Drop stale UI sessions that have no JWT. */
function readInitialUser() {
  const saved = readPersistedUser()
  if (saved && !getApiAccessToken()) {
    clearAllAuthStorage()
    return null
  }
  return saved
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readInitialUser())

  /** Refresh staff RBAC after reload when JWT exists. */
  useEffect(() => {
    const token = getApiAccessToken()
    const saved = readPersistedUser()
    if (!token || !saved) return
    let cancelled = false
    fetchCurrentUserMe()
      .then(({ data }) => {
        if (cancelled) return
        const merged = {
          ...saved,
          rbac: data,
          last_login: data?.last_login ?? saved?.last_login,
          picture: data?.picture ?? saved?.picture,
          photoURL: data?.picture ?? saved?.photoURL ?? saved?.picture,
        }
        setUser(merged)
        persistAuthenticatedUser(merged, isRememberMeSession())
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Store JWT + user profile; fetch /api/me/ for RBAC.
   * @param {{ access: string, refresh: string, user?: { email?: string, name?: string } }} payload
   */
  const completeJwtLogin = useCallback(async (payload, rememberMe) => {
    const { access, refresh, user: u } = payload
    if (!access || !refresh) {
      return { ok: false, error: 'Invalid server response.' }
    }
    setApiTokens(access, refresh, rememberMe)
    const authMethod = u?.auth_method === 'google' ? 'google' : 'otp'
    let nextUser = {
      email: u?.email || '',
      name: u?.name || u?.email?.split('@')[0] || 'User',
      last_login: u?.last_login ?? null,
      picture: u?.picture || '',
      photoURL: u?.picture || '',
      provider: authMethod,
    }
    try {
      const { data } = await fetchCurrentUserMe()
      nextUser = {
        ...nextUser,
        rbac: data,
        last_login: data?.last_login ?? nextUser.last_login,
        picture: data?.picture || nextUser.picture,
      }
    } catch {
      /* offline / API down */
    }
    upsertSavedAccount({
      email: nextUser.email,
      name: nextUser.name,
      picture: nextUser.picture,
      provider: authMethod,
    })
    setUser(nextUser)
    persistAuthenticatedUser(nextUser, rememberMe)
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    clearAllAuthStorage()
  }, [])

  const logoutAllDevices = useCallback(async () => {
    try {
      await logoutAllDevicesRequest()
    } catch {
      /* still clear local session */
    }
    setUser(null)
    clearAllAuthStorage()
  }, [])

  const refreshRbac = useCallback(async () => {
    const token = getApiAccessToken()
    if (!token) return
    try {
      const { data } = await fetchCurrentUserMe()
      setUser((prev) => {
        if (!prev) return prev
        const next = {
          ...prev,
          rbac: data,
          last_login: data?.last_login ?? prev.last_login,
          picture: data?.picture ?? prev.picture,
          photoURL: data?.picture ?? prev.photoURL ?? prev.picture,
        }
        persistAuthenticatedUser(next, isRememberMeSession())
        return next
      })
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      rbac: user?.rbac ?? null,
      isAuthenticated: Boolean(user),
      completeJwtLogin,
      logout,
      logoutAllDevices,
      refreshRbac,
    }),
    [user, completeJwtLogin, logout, logoutAllDevices, refreshRbac]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
