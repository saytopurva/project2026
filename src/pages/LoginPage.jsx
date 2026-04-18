import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/Button'
import { InputField } from '../components/InputField'
import { PasswordField } from '../components/PasswordField'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import {
  emailErrorMessage,
  passwordErrorMessage,
} from '../utils/validation'
import { isFirebaseConfigured } from '../firebase/config'

/**
 * Centered login: validation, remember me, email/password + Google → OTP.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const { loginWithPassword, loginWithGoogle, isAuthenticated, needsOtp } =
    useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
    else if (needsOtp) navigate('/verify-otp', { replace: true })
  }, [isAuthenticated, needsOtp, navigate, from])

  const validate = () => {
    const eErr = emailErrorMessage(email)
    const pErr = passwordErrorMessage(password)
    setFieldErrors({
      ...(eErr && { email: eErr }),
      ...(pErr && { password: pErr }),
    })
    return !eErr && !pErr
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await loginWithPassword(email, password, rememberMe)
      if (!res.ok) {
        notify.error(res.error || 'Login failed.')
        return
      }
      notify.success('Enter the verification code to continue.')
      navigate('/verify-otp', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const res = await loginWithGoogle(rememberMe)
      if (!res.ok) {
        notify.error(res.error)
        return
      }
      notify.success('Enter the verification code to continue.')
      navigate('/verify-otp', { replace: true })
    } finally {
      setGoogleLoading(false)
    }
  }

  const googleReady = isFirebaseConfigured()

  if (isAuthenticated || needsOtp) return null

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50/50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950/30">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-100/50 via-transparent to-indigo-50/40 dark:from-sky-900/20 dark:to-indigo-950/20"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-8 shadow-xl shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-slate-950/50 dark:ring-slate-700/80">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
              Student Management
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sign in to dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Secure access for administrators
            </p>
          </div>

          {submitting ? (
            <Loader label="Signing in…" className="py-4" />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <InputField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                autoComplete="email"
                disabled={googleLoading}
              />
              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                autoComplete="current-password"
                disabled={googleLoading}
              />

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-500"
                />
                Remember me on this device
              </label>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={googleLoading}
              >
                Continue to verification
              </Button>
            </form>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                or
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={googleLoading}
            disabled={submitting}
            onClick={handleGoogle}
            className="border-slate-200 bg-slate-50 text-slate-800 hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {!googleLoading ? <GoogleIcon /> : null}
            Continue with Google
          </Button>

          {!googleReady ? (
            <p className="mt-4 text-center text-xs text-amber-800 dark:text-amber-200">
              Configure Firebase (
              <code className="rounded bg-amber-50 px-1 ring-1 ring-amber-100 dark:bg-amber-950/50 dark:ring-amber-900/60">
                .env
              </code>
              )
              to enable Google.
            </p>
          ) : null}

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Demo code after this step:{' '}
            <strong className="text-slate-800 dark:text-slate-200">123456</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
