import { Card } from '../Card'

function formatTime(t) {
  return String(t).slice(0, 5)
}

/**
 * Shows today's free lectures (green).
 */
export function FreeSlots({ freeSlots = [] }) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Free lectures
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Time slots with no class assigned
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Free
        </span>
      </div>

      {freeSlots.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          No free lectures today.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {freeSlots.map((s, idx) => (
            <li
              key={`${s.start_time}-${s.end_time}-${idx}`}
              className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900 transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100"
            >
              <span className="font-semibold tabular-nums">
                {formatTime(s.start_time)}–{formatTime(s.end_time)}
              </span>
              <span className="text-xs font-medium text-emerald-700/80 dark:text-emerald-200/80">
                Available
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

