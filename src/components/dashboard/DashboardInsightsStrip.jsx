import { AlertTriangle, BookOpen } from 'lucide-react'

/**
 * Highlights weak subjects and attendance risk (compact SaaS-style strip).
 */
export function DashboardInsightsStrip({
  weakSubject,
  lowAttendanceCount,
  onNavigateMarks,
  onNavigateAttendance,
  includeAttendance = true,
}) {
  const showWeak = Boolean(weakSubject)
  const showLow = includeAttendance && lowAttendanceCount > 0

  if (!showWeak && !showLow) {
    return (
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-3 py-2 text-[11px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
        {includeAttendance
          ? 'All clear — no weak subjects or attendance alerts for the sampled class.'
          : 'No weak subjects flagged for the sampled class.'}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {showWeak ? (
        <button
          type="button"
          onClick={onNavigateMarks}
          className="flex items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50/50 px-3 py-2 text-left transition hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Weak subject
            </p>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{weakSubject}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Review marks & support</p>
          </div>
        </button>
      ) : null}
      {showLow ? (
        <button
          type="button"
          onClick={onNavigateAttendance}
          className="flex items-start gap-2 rounded-xl border border-rose-200/90 bg-rose-50/50 px-3 py-2 text-left transition hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">
              Low attendance
            </p>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
              {lowAttendanceCount} absent / leave today
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Follow up in class sheet</p>
          </div>
        </button>
      ) : null}
    </div>
  )
}
