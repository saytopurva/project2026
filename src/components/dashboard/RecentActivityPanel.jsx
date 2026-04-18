import { Card } from '../Card'

const TYPE_STYLES = {
  student:
    'bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-800/60',
  attendance:
    'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/60',
  marks:
    'bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/60',
}

/**
 * Timeline-style list of recent admin actions.
 */
export function RecentActivityPanel({ items }) {
  return (
    <Card
      compact
      className="border-slate-100 shadow-sm shadow-slate-200/30 transition-shadow duration-200 hover:shadow-md dark:border-slate-800 dark:shadow-slate-950/25"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent activity</h3>
        <span className="rounded-full bg-sky-50 px-2 py-px text-[10px] font-medium text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/60">
          Live
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Latest updates</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex gap-2.5 border-l-2 border-slate-100 pl-3 transition-colors hover:border-sky-300 dark:border-slate-700 dark:hover:border-sky-600"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${TYPE_STYLES[item.type] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'}`}
              aria-hidden
            >
              {item.type === 'student' ? 'St' : item.type === 'attendance' ? 'At' : 'Mk'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-snug text-slate-900 dark:text-slate-100">{item.message}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">{item.detail}</p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {item.time}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
