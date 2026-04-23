import { useAuth } from '../hooks/useAuth'

export function AccessRejectedPage() {
  const { logout, user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-rose-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-rose-200/80 bg-white/90 p-8 text-center shadow-xl dark:border-rose-900/50 dark:bg-slate-900/90">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl dark:bg-rose-950/50">
          ✕
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Access not granted
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Your sign-in request for <strong>{user?.email}</strong> was not approved. Contact
          the school administration if you believe this is a mistake.
        </p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-8 w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
