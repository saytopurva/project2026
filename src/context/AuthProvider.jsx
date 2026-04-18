import { useCallback, useEffect, useMemo, useState } from 'react'
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import {
  getFirebaseAuth,
  googleProvider,
  isFirebaseConfigured,
} from '../firebase/config'
import { bootstrapDjangoJwt } from '../services/djangoAuthService'
import { loginWithEmailApi, verifyOtpApi } from '../services/authService'
import {
  clearAllAuthStorage,
  clearApiSessionPassword,
  consumeRememberMeIntent,
  getApiAccessToken,
  getApiSessionPassword,
  isRememberMeSession,
  readOtpPendingUser,
  readPersistedUser,
  persistAuthenticatedUser,
  setApiSessionPassword,
  setApiTokens,
  setRememberMeIntent,
  writeOtpPendingUser,
} from '../utils/storage'
import { fetchCurrentUserMe } from '../services/meApi'
import { AuthContext } from './authContext'

/** Drop stale UI sessions that have no JWT (upgrades / failed bootstrap). */
function readInitialUser() {
  const saved = readPersistedUser()
  if (saved && !getApiAccessToken()) {
    clearAllAuthStorage()
    return null
  }
  return saved
}

/**
 * Syncs pending OTP user to sessionStorage so a refresh on /verify-otp still works.
 */
function persistPending(userDraft) {
  writeOtpPendingUser(userDraft)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readInitialUser())
  const [pendingOtpUser, setPendingOtpUser] = useState(() =>
    readOtpPendingUser()
  )

  // Clear orphaned Firebase web sessions (user closed tab before OTP).
  useEffect(() => {
    const saved = readPersistedUser()
    const pending = readOtpPendingUser()
    const auth = getFirebaseAuth()
    if (auth?.currentUser && !saved && !pending) {
      firebaseSignOut(auth).catch(() => {})
    }
  }, [])

  /** Refresh staff role/scope from Django after JWT exists. */
  useEffect(() => {
    const token = getApiAccessToken()
    const saved = readPersistedUser()
    if (!token || !saved) return
    let cancelled = false
    fetchCurrentUserMe()
      .then(({ data }) => {
        if (cancelled) return
        const merged = { ...saved, rbac: data }
        setUser(merged)
        persistAuthenticatedUser(merged, isRememberMeSession())
      })
      .catch(() => {
        /* keep session; /api/me/ may fail if API down */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setPending = useCallback((draft) => {
    setPendingOtpUser(draft)
    persistPending(draft)
  }, [])

  const loginWithPassword = useCallback(
    async (email, password, rememberMe) => {
      try {
        const profile = await loginWithEmailApi({ email, password })
        setRememberMeIntent(rememberMe)
        setApiSessionPassword(password)
        setPending(profile)
        return { ok: true }
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Login failed. Please try again.'
        return { ok: false, error: msg }
      }
    },
    [setPending]
  )

  const verifyOtpAndCompleteLogin = useCallback(
    async (otp) => {
      if (!pendingOtpUser) {
        return { ok: false, error: 'Session expired. Please sign in again.' }
      }
      try {
        await verifyOtpApi(otp)
        const rememberMe = consumeRememberMeIntent()
        const apiPassword = getApiSessionPassword()
        const jwtRes = await bootstrapDjangoJwt(
          pendingOtpUser.email,
          apiPassword,
          pendingOtpUser.name
        )
        clearApiSessionPassword()
        if (jwtRes.ok && jwtRes.access) {
          setApiTokens(jwtRes.access, jwtRes.refresh, rememberMe)
        }
        let nextUser = pendingOtpUser
        if (jwtRes.ok && jwtRes.access) {
          try {
            const { data } = await fetchCurrentUserMe()
            nextUser = { ...pendingOtpUser, rbac: data }
          } catch {
            /* ignore */
          }
        }
        setUser(nextUser)
        persistAuthenticatedUser(nextUser, rememberMe)
        setPendingOtpUser(null)
        persistPending(null)
        if (!jwtRes.ok) {
          return { ok: true, apiWarning: jwtRes.error }
        }
        return { ok: true }
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Verification failed.'
        return { ok: false, error: msg }
      }
    },
    [pendingOtpUser]
  )

  /**
   * Google always continues to OTP (same flow as email).
   * Remember-me follows the checkbox on the login form via setRememberMeIntent.
   */
  const loginWithGoogle = useCallback(
    async (rememberMe) => {
      if (!isFirebaseConfigured()) {
        return {
          ok: false,
          error:
            'Firebase is not configured. Add VITE_FIREBASE_* keys to your .env file.',
        }
      }
      const auth = getFirebaseAuth()
      if (!auth) {
        return { ok: false, error: 'Firebase Auth could not be initialized.' }
      }
      try {
        const cred = await signInWithPopup(auth, googleProvider)
        const u = cred.user
        setRememberMeIntent(rememberMe)
        const profile = {
          email: u.email || '',
          name: u.displayName || u.email?.split('@')[0] || 'User',
          photoURL: u.photoURL || null,
          provider: 'google',
        }
        const apiPw =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `g-${Date.now()}`
        setApiSessionPassword(apiPw)
        setPending(profile)
        return { ok: true }
      } catch (e) {
        const message =
          e?.code === 'auth/popup-closed-by-user'
            ? 'Sign-in was cancelled.'
            : e?.message || 'Google sign-in failed.'
        return { ok: false, error: message }
      }
    },
    [setPending]
  )

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (auth?.currentUser) {
      try {
        await firebaseSignOut(auth)
      } catch {
        /* still clear local session */
      }
    }
    setUser(null)
    setPendingOtpUser(null)
    clearAllAuthStorage()
  }, [])

  const value = useMemo(
    () => ({
      user,
      rbac: user?.rbac ?? null,
      pendingOtpUser,
      isAuthenticated: Boolean(user),
      needsOtp: Boolean(pendingOtpUser),
      loginWithPassword,
      verifyOtpAndCompleteLogin,
      loginWithGoogle,
      logout,
    }),
    [
      user,
      pendingOtpUser,
      loginWithPassword,
      verifyOtpAndCompleteLogin,
      loginWithGoogle,
      logout,
    ]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}
