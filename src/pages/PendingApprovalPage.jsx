import { useAuth } from '../hooks/useAuth'

/**
 * Shown when the user signed in with OTP but has not been approved by administration yet.
 */
export function PendingApprovalPage() {
  const { logout, user, refreshRbac } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-950/50">
          ⏳
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Access pending approval
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Your account ({user?.email}) is waiting to be reviewed by the Principal or Vice
          Principal. You will be able to use the system after a role is assigned.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => refreshRbac()}
            className="w-full rounded-xl bg-sky-600 py-3 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            I was approved — refresh status
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
