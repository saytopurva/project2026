import { useMemo } from 'react'
import { Card } from '../Card'
import { Button } from '../Button'

function formatTime(t) {
  return String(t).slice(0, 5)
}

/**
 * Substitutions: red for pending, blue for assigned.
 * Teachers see "Accept" for pending items; Principals see "Assign" (placeholder UX).
 */
export function SubstitutionPanel({
  items = [],
  role,
  busy,
  onAccept,
  onAssign,
}) {
  const { pending, assigned } = useMemo(() => {
    const p = []
    const a = []
    for (const row of items) {
      if (row.status === 'ASSIGNED') a.push(row)
      else p.push(row)
    }
    return { pending: p, assigned: a }
  }, [items])

  const canAssign = role === 'principal' || role === 'vice_principal'

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Substitution
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Lectures needing a substitute teacher
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {pending.length} pending
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          No substitutions today.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {pending.length ? (
            <div className="overflow-hidden rounded-xl border border-rose-200 dark:border-rose-900/50">
              <div className="bg-rose-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
                Pending
              </div>
              <div className="divide-y divide-rose-100 bg-white dark:divide-rose-900/30 dark:bg-slate-900">
                {pending.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatTime(row.start_time)}–{formatTime(row.end_time)} · {row.class_name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {row.subject?.name || '—'} · Absent: {row.original_teacher?.name || row.original_teacher?.email}
                      </p>
                    </div>
                    {canAssign ? (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => onAssign?.(row)}
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-950/30"
                      >
                        Assign
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        disabled={busy}
                        onClick={() => onAccept?.(row)}
                      >
                        Accept
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {assigned.length ? (
            <div className="overflow-hidden rounded-xl border border-sky-200 dark:border-sky-900/50">
              <div className="bg-sky-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
                Assigned
              </div>
              <div className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {assigned.map((row) => (
                  <div key={row.id} className="px-3 py-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatTime(row.start_time)}–{formatTime(row.end_time)} · {row.class_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {row.subject?.name || '—'} · Substitute: {row.substitute_teacher?.name || row.substitute_teacher?.email || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

