import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { getEventTypeMeta } from './eventTypeMeta'

function dateLabel(dateKey) {
  try {
    return format(parseISO(dateKey), 'EEEE, MMM d')
  } catch {
    return dateKey
  }
}

export function EventList({ dateKeyValue, events, deletingId, onDelete }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Events on {dateLabel(dateKeyValue)}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {events.length} item{events.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {!events.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center dark:border-slate-600 dark:bg-slate-900/40">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No events for this day.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add one using the form to the left.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {events.map((ev) => {
            const meta = getEventTypeMeta(ev.event_type)
            const busy = deletingId === ev.id
            return (
              <li
                key={ev.id}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.colorClass}`}>
                    <meta.Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{ev.title}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${meta.colorClass}`}>
                        {meta.label}
                      </span>
                    </div>
                    {ev.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                        {ev.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ev.author_name}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      {format(parseISO(ev.created_at), 'PP · p')}
                    </p>
                  </div>
                </div>

                {ev.is_mine ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(ev.id)}
                    title="Delete event"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
                  >
                    {busy ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-700 dark:border-red-800 dark:border-t-red-300" />
                    ) : (
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    )}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

