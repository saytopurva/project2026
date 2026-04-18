import { Card } from '../Card'

/**
 * Today’s headcount summary (present vs absent vs leave).
 */
export function AttendanceSnapshot({ present, absent, leave = 0, dateLabel }) {
  const total = present + absent + leave
  const presentPct = total ? Math.round((present / total) * 100) : 0

  return (
    <Card className="border-slate-100 shadow-md shadow-slate-200/40 transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Today&apos;s attendance</h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{dateLabel}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl bg-emerald-50/90 p-4 ring-1 ring-emerald-100/80 dark:bg-emerald-950/30 dark:ring-emerald-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Present
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
            {present}
          </p>
        </div>
        <div className="rounded-2xl bg-rose-50/90 p-4 ring-1 ring-rose-100/80 dark:bg-rose-950/30 dark:ring-rose-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-400">Absent</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-900 dark:text-rose-100">{absent}</p>
        </div>
        <div className="rounded-2xl bg-amber-50/90 p-4 ring-1 ring-amber-100/80 dark:bg-amber-950/30 dark:ring-amber-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">Leave</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-100">{leave}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Attendance rate</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{presentPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
            style={{ width: `${presentPct}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
