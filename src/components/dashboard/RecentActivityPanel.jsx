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
    <Card className="border-slate-100 shadow-md shadow-slate-200/40 transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent activity</h3>
        <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/60">
          Live
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Latest changes across your school</p>
      <ul className="mt-5 space-y-4">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex gap-3 border-l-2 border-slate-100 pl-4 transition-colors hover:border-sky-300 dark:border-slate-700 dark:hover:border-sky-600"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${TYPE_STYLES[item.type] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'}`}
              aria-hidden
            >
              {item.type === 'student' ? 'St' : item.type === 'attendance' ? 'At' : 'Mk'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.message}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {item.time}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
