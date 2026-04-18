import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Loader } from '../components/Loader'
import { OtpInput } from '../components/OtpInput'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { resendOtpApi } from '../services/authService'
import { MOCK_OTP, OTP_TIMER_SECONDS } from '../utils/constants'

/**
 * OTP step for every login path; countdown + resend (mock).
 */
export function OtpPage() {
  const navigate = useNavigate()
  const { pendingOtpUser, verifyOtpAndCompleteLogin, isAuthenticated } =
    useAuth()

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(OTP_TIMER_SECONDS)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
    else if (!pendingOtpUser) navigate('/login', { replace: true })
  }, [isAuthenticated, pendingOtpUser, navigate])

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.length !== 6) {
      setError('Please enter all 6 digits.')
      return
    }
    setLoading(true)
    try {
      const res = await verifyOtpAndCompleteLogin(otp)
      if (!res.ok) {
        setError(res.error || 'Verification failed.')
        notify.error(res.error || 'Verification failed.')
        return
      }
      if (res.apiWarning) {
        notify.warn(
          `Signed in, but API token failed: ${res.apiWarning}. Check Django is running.`
        )
      } else {
        notify.success('Welcome back!')
      }
      navigate('/', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return
    setResending(true)
    setError('')
    try {
      await resendOtpApi()
      setSecondsLeft(OTP_TIMER_SECONDS)
      notify.success('Code resent. Demo OTP is still 123456.')
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || 'Could not resend code.'
      notify.error(msg)
    } finally {
      setResending(false)
    }
  }

  if (isAuthenticated) return null
  if (!pendingOtpUser) return null

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-sky-100/40 via-transparent to-transparent dark:from-sky-900/15"
        aria-hidden
      />
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-8 shadow-xl shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-slate-950/50 dark:ring-slate-700/80">
          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Two-factor verification
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Code sent to{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {pendingOtpUser?.email}
            </span>
          </p>
          <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            Demo OTP: <strong className="text-sky-700 dark:text-sky-400">{MOCK_OTP}</strong>
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span
              className={`font-mono tabular-nums ${
                secondsLeft > 0 ? 'text-slate-600 dark:text-slate-400' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {secondsLeft > 0
                ? `Resend in ${formatTime(secondsLeft)}`
                : 'You can resend now'}
            </span>
          </div>

          {loading ? (
            <div className="mt-8">
              <Loader label="Verifying…" />
            </div>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-6">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              {error ? (
                <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}
              <Button type="submit" variant="primary" fullWidth>
                Verify & enter dashboard
              </Button>
            </form>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={secondsLeft > 0 || resending}
              onClick={handleResend}
              className="text-center text-sm font-medium text-sky-700 transition hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {resending ? 'Sending…' : 'Resend OTP'}
            </button>
            <span className="hidden text-slate-300 sm:inline dark:text-slate-600">·</span>
            <button
              type="button"
              className="text-center text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
