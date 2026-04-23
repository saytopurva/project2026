import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight, UserPlus, X } from 'lucide-react'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { Loader } from '../components/Loader'
import { OtpInput } from '../components/OtpInput'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import {
  googleLoginRequest,
  sendOtpRequest,
  verifyOtpRequest,
} from '../services/authService'
import { emailErrorMessage } from '../utils/validation'
import { formatApiError } from '../utils/formatApiError'
import { OTP_TIMER_SECONDS } from '../utils/constants'
import { listSavedAccounts, removeSavedAccount } from '../utils/accountStorage'

const APP_NAME = 'SMS'
const PREFILL_EMAIL_KEY = 'sms_prefill_email'

/** Google-style avatar color from email (stable hue). */
function avatarStyleForEmail(email) {
  let h = 0
  const s = String(email || '')
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h)
  }
  const hue = Math.abs(h) % 360
  return {
    backgroundColor: `hsl(${hue} 42% 46%)`,
  }
}

/** Google-style multicolor mark (brand hint, not the Google logo). */
function AccountAvatar({ acc }) {
  const initial = (acc.name || acc.email || '?')[0].toUpperCase()
  if (acc.picture) {
    return (
      <img
        src={acc.picture}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-medium text-white"
      style={avatarStyleForEmail(acc.email)}
      aria-hidden
    >
      {initial}
    </span>
  )
}

function OrDivider() {
  return (
    <div className="relative py-5">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-[#dadce0] dark:border-[#5f6368]" />
      </div>
      <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6]">
        <span className="bg-white px-3 dark:bg-[#303134]">or</span>
      </div>
    </div>
  )
}

function GoogleLoginSection({ busy, onSuccess, onError }) {
  return (
    <>
      <OrDivider />
      <div className="flex w-full flex-col items-center px-0">
        <GoogleSignInButton
          onSuccess={onSuccess}
          onError={onError}
          disabled={busy}
        />
      </div>
    </>
  )
}

function SmsProductMark({ className = '' }) {
  return (
    <div
      className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-9 w-9" role="img" aria-label="">
        <circle cx="20" cy="20" r="18" fill="#fff" />
        <path
          fill="#4285F4"
          d="M20 8a12 12 0 0110.4 6h-6.2A5.8 5.8 0 0020 12c-3.2 0-5.8 2.6-5.8 5.8 0 1 .3 2 .8 2.8l-5 3.8A12 12 0 0120 8z"
        />
        <path
          fill="#EA4335"
          d="M32.2 20c0 1.2-.2 2.3-.6 3.4H25v-4.6h4.1c-.2-1-.6-2-1.1-2.8l3.5-2.7c1 1.6 1.6 3.5 1.7 5.7z"
        />
        <path
          fill="#FBBC05"
          d="M14.2 26.6l5-3.8c.5.8 1.2 1.4 2 1.9 1 .6 2.1.9 3.3.9 1.3 0 2.5-.3 3.5-.9l3.5 2.7A11.9 11.9 0 0120 32c-3.5 0-6.6-1.5-8.8-3.9z"
        />
        <path
          fill="#34A853"
          d="M8 20c0-2.2.6-4.3 1.7-6.1l5 3.8c-.5.8-.8 1.8-.8 2.8 0 1.1.3 2.1.8 3l-5 3.8A12 12 0 018 20z"
        />
      </svg>
    </div>
  )
}

/**
 * Email OTP — Google account–style chooser and Material-like sign-in steps.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const { isAuthenticated, completeJwtLogin } = useAuth()

  const [savedAccounts, setSavedAccounts] = useState(() => listSavedAccounts())
  const [authTab, setAuthTab] = useState('email') // 'email' | 'phone' | 'google'
  const [step, setStep] = useState(() =>
    listSavedAccounts().length > 0 ? 'pick' : 'email'
  )
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [fieldError, setFieldError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [expiresHint, setExpiresHint] = useState(300)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  const googleClientConfigured = Boolean(
    (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
  )

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Switching auth tabs resets transient state for a clean UX.
  useEffect(() => {
    setFieldError('')
    setOtp('')
    setResendSeconds(0)
    if (authTab === 'google') {
      setStep('email')
    } else if (authTab === 'email') {
      setStep(listSavedAccounts().length > 0 ? 'pick' : 'email')
    } else {
      setStep('email')
    }
  }, [authTab])

  useEffect(() => {
    if (step !== 'email') return
    try {
      const p = sessionStorage.getItem(PREFILL_EMAIL_KEY)
      if (p)
        setEmail((prev) => (prev.trim() ? prev : p))
    } catch {
      /* ignore */
    }
  }, [step])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const t = window.setInterval(() => {
      setResendSeconds((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [resendSeconds])

  const emailValid = useMemo(() => !emailErrorMessage(email), [email])

  const applySendResponse = (data) => {
    const devCode = import.meta.env.DEV && data?.dev_otp_code
    setOtp(devCode ? String(devCode) : '')
    setResendSeconds(
      Number(data.resend_after_seconds) || OTP_TIMER_SECONDS
    )
    setExpiresHint(Number(data.expires_in_seconds) || 300)
    if (devCode) {
      notify.success('Dev: OTP filled automatically (console email).')
    } else {
      notify.success('OTP sent to your email.')
    }
  }

  const sendOtpTo = async (addr) => {
    const normalized = addr.trim().toLowerCase()
    setSending(true)
    try {
      const data = await sendOtpRequest(normalized)
      setEmail(normalized)
      setStep('otp')
      applySendResponse(data)
    } catch (err) {
      notify.error(formatApiError(err) || 'Could not send code.')
    } finally {
      setSending(false)
    }
  }

  const handleSendOtp = async (e) => {
    e?.preventDefault?.()
    const err = emailErrorMessage(email)
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError('')
    await sendOtpTo(email)
  }

  const handleContinueAs = async (acc) => {
    setFieldError('')
    await sendOtpTo(acc.email)
  }

  const handleAddAnother = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setFieldError('')
  }

  const handleResend = async () => {
    if (resendSeconds > 0 || sending) return
    await sendOtpTo(email)
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    const cred = credentialResponse?.credential
    if (!cred) {
      notify.error('No credential from Google.')
      return
    }
    setGoogleBusy(true)
    try {
      const data = await googleLoginRequest(cred)
      if (data?.user?.email) {
        try {
          sessionStorage.setItem(PREFILL_EMAIL_KEY, data.user.email)
        } catch {
          /* ignore */
        }
      }
      const res = await completeJwtLogin(data, rememberMe)
      if (!res.ok) {
        notify.error(res.error || 'Could not sign in.')
        return
      }
      setSavedAccounts(listSavedAccounts())
      notify.success('Signed in with Google')
      navigate(from, { replace: true })
    } catch (e) {
      notify.error(formatApiError(e) || 'Google sign-in failed.')
    } finally {
      setGoogleBusy(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      notify.error('Enter the 6-digit code.')
      return
    }
    setVerifying(true)
    try {
      const data = await verifyOtpRequest(
        email.trim().toLowerCase(),
        otp
      )
      const res = await completeJwtLogin(data, rememberMe)
      if (!res.ok) {
        notify.error(res.error || 'Could not sign in.')
        return
      }
      setSavedAccounts(listSavedAccounts())
      notify.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      notify.error(formatApiError(err) || 'Invalid or expired code.')
    } finally {
      setVerifying(false)
    }
  }

  if (isAuthenticated) return null

  const formatClock = (s) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT: brand / gradient panel (hidden on mobile) */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600" />
          <div
            className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-white/15 blur-2xl"
            aria-hidden
          />
          <div
            className="absolute -bottom-28 right-10 h-96 w-96 rounded-full bg-black/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div>
              <div className="inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-lg font-semibold shadow-sm">
                  {APP_NAME}
                </span>
                <span className="text-sm font-semibold tracking-wide opacity-90">
                  Student Management System
                </span>
              </div>
              <h2 className="mt-10 text-4xl font-semibold leading-tight tracking-tight">
                Smart Student Management System
              </h2>
              <p className="mt-4 max-w-md text-base leading-6 text-white/85">
                A clean, secure admin experience for attendance, marks and student records—built for speed and clarity.
              </p>
            </div>
            <p className="text-sm text-white/75">Powered by SMS</p>
          </div>
        </div>

        {/* RIGHT: auth card */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div
            className={`w-full max-w-md transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="mb-8 lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-600 dark:text-primary-400">
                {APP_NAME}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Smart Student Management System
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_10px_30px_-18px_rgba(2,6,23,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sign in to continue
              </p>

              {/* Tabs */}
              <div className="mt-6">
                <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <TabButton
                    active={authTab === 'email'}
                    onClick={() => setAuthTab('email')}
                  >
                    Email OTP
                  </TabButton>
                  <TabButton
                    active={authTab === 'phone'}
                    onClick={() => setAuthTab('phone')}
                  >
                    Phone OTP
                  </TabButton>
                  <TabButton
                    active={authTab === 'google'}
                    onClick={() => setAuthTab('google')}
                  >
                    Google
                  </TabButton>
                </div>
              </div>

              {/* Panels */}
              <div className="mt-6">
                {authTab === 'google' ? (
                  <div className="space-y-5">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Continue with your Google account.
                    </p>
                    {googleClientConfigured ? (
                      <div className="flex w-full flex-col items-center">
                        <GoogleSignInButton
                          onSuccess={handleGoogleSuccess}
                          onError={() =>
                            notify.error('Google sign-in was cancelled or failed.')
                          }
                          disabled={googleBusy}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                        Google login isn’t configured yet.
                      </div>
                    )}

                    <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                      />
                      Remember this device
                    </label>

                    {googleBusy ? (
                      <Loader label="Signing in…" className="py-2" />
                    ) : null}
                  </div>
                ) : null}

                {authTab === 'phone' ? (
                  <div className="space-y-5">
                    <div>
                      <label
                        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                        htmlFor="phone"
                      >
                        Phone number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone"
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Phone OTP is coming soon. Use Email OTP or Google for now.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white opacity-50"
                    >
                      Send OTP
                    </button>
                  </div>
                ) : null}

                {authTab === 'email' ? (
                  <div className="space-y-6">
                    {step === 'pick' ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Continue with a saved account
                        </p>
                        <ul className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                          {savedAccounts.map((acc, i) => (
                            <li
                              key={acc.email}
                              className={
                                i > 0
                                  ? 'border-t border-slate-200 dark:border-slate-800'
                                  : ''
                              }
                            >
                              <div className="flex items-stretch">
                                <button
                                  type="button"
                                  disabled={sending || googleBusy}
                                  onClick={() => handleContinueAs(acc)}
                                  className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800/60"
                                >
                                  <AccountAvatar acc={acc} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                                      {acc.name}
                                    </span>
                                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                      {acc.email}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    className="h-5 w-5 shrink-0 text-slate-400"
                                    strokeWidth={2}
                                    aria-hidden
                                  />
                                </button>
                                <button
                                  type="button"
                                  title="Remove from this device"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeSavedAccount(acc.email)
                                    const next = listSavedAccounts()
                                    setSavedAccounts(next)
                                    if (next.length === 0) setStep('email')
                                  }}
                                  className="flex w-11 shrink-0 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                                >
                                  <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={handleAddAnother}
                          disabled={sending}
                          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
                        >
                          <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Add another account
                        </button>

                        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                          />
                          Remember this device
                        </label>

                        {sending ? <Loader label="Sending code…" className="py-2" /> : null}
                      </div>
                    ) : null}

                    {step === 'email' ? (
                      <form onSubmit={handleSendOtp} className="space-y-5">
                        {savedAccounts.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStep('pick')
                              setFieldError('')
                            }}
                            className="text-sm font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400"
                          >
                            ← Continue with a saved account
                          </button>
                        ) : null}

                        <div>
                          <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                          >
                            Email
                          </label>
                          <input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              setFieldError('')
                            }}
                            disabled={sending}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="Enter your email"
                          />
                          {fieldError ? (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                              {fieldError}
                            </p>
                          ) : null}
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                          />
                          Remember this device
                        </label>

                        <button
                          type="submit"
                          disabled={!emailValid || googleBusy || sending}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {sending ? 'Sending…' : 'Send OTP'}
                        </button>
                      </form>
                    ) : null}

                    {step === 'otp' ? (
                      <form onSubmit={handleVerify} className="space-y-6">
                        <button
                          type="button"
                          onClick={() => {
                            setStep(savedAccounts.length > 0 ? 'pick' : 'email')
                            setOtp('')
                          }}
                          className="text-sm font-semibold text-primary-600 transition hover:text-primary-700 dark:text-primary-400"
                        >
                          ← Back
                        </button>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                          We sent a 6‑digit code to <span className="font-semibold">{email}</span>. Code expires in ~{Math.ceil(expiresHint / 60)} min.
                        </div>

                        <div className="space-y-3">
                          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                            Verification code
                          </span>
                          <OtpInput
                            key={`otp-${email}`}
                            variant="google"
                            value={otp}
                            onChange={setOtp}
                            disabled={verifying}
                            autoFocus
                          />
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600"
                          />
                          Remember this device
                        </label>

                        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {resendSeconds > 0
                              ? `Resend in ${formatClock(resendSeconds)}`
                              : 'Didn’t get the email?'}
                          </span>
                          <button
                            type="button"
                            disabled={resendSeconds > 0 || sending}
                            onClick={handleResend}
                            className="text-sm font-semibold text-primary-600 transition hover:text-primary-700 disabled:text-slate-400 dark:text-primary-400 dark:disabled:text-slate-600"
                          >
                            {sending ? 'Sending…' : 'Resend OTP'}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={otp.length !== 6 || verifying}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {verifying ? 'Verifying…' : 'Continue'}
                        </button>
                        {verifying ? (
                          <Loader label="Signing in…" className="py-1" />
                        ) : null}
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Powered by SMS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-3 py-2 text-xs font-semibold tracking-tight transition',
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
      ].join(' ')}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

