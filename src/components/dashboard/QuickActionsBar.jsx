import { CheckCircle2, Plus, Star } from 'lucide-react'

/**
 * Premium compact quick actions — Take attendance, Add student, Enter marks.
 */
export function QuickActionsBar({
  onMarkAttendance,
  onAddStudent,
  onAddMarks,
  showAttendance = true,
  showAddStudent = true,
}) {
  const btn =
    'group inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-slate-500 sm:flex-none sm:px-4'

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
      {showAttendance ? (
      <button type="button" onClick={onMarkAttendance} className={`${btn} hover:border-emerald-300/80 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        Take attendance
      </button>
      ) : null}
      {showAddStudent ? (
      <button type="button" onClick={onAddStudent} className={`${btn} hover:border-sky-300/80 hover:bg-sky-50/80 dark:hover:bg-sky-950/30`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        Add student
      </button>
      ) : null}
      <button type="button" onClick={onAddMarks} className={`${btn} hover:border-amber-300/80 hover:bg-amber-50/80 dark:hover:bg-amber-950/25`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Star className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
        Enter marks
      </button>
    </div>
  )
}
