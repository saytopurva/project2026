import { Card } from '../Card'

/**
 * @param {object} props
 * @param {{ total_days?: number, present?: number, absent?: number, leave?: number, percentage?: number }} props.summary
 * @param {string} [props.title]
 */
export function AttendanceSummary({ summary, title = 'Monthly summary' }) {
  const total = summary?.total_days ?? 0
  const present = summary?.present ?? 0
  const absent = summary?.absent ?? 0
  const leave = summary?.leave ?? 0
  const pct = typeof summary?.percentage === 'number' ? summary.percentage : 0

  return (
    <Card className="border-slate-100 shadow-md dark:border-slate-800">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total days', total],
          ['Present', present],
          ['Absent', absent],
          ['Leave', leave],
        ].map(([k, v]) => (
          <div
            key={k}
            className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Attendance %</span>
          <span className="tabular-nums font-bold text-sky-700 dark:text-sky-300">{pct}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
