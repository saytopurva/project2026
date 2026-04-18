import { statusMeta } from './constants'

const todayStr = () => new Date().toISOString().slice(0, 10)

/**
 * @param {object} props
 * @param {Array<{ id: number, date: string, status: string, reason?: string, marked_by_name?: string, student_name?: string }>} props.rows
 * @param {boolean} [props.loading]
 * @param {boolean} [props.showStudent]
 * @param {(row: object) => void} [props.onEdit]
 * @param {(id: number) => void} [props.onDelete]
 */
export function AttendanceTable({ rows, loading, showStudent, onEdit, onDelete }) {
  if (loading) {
    return <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
  }
  if (!rows?.length) {
    return <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No records for this filter.</p>
  }

  const t = todayStr()

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 transition-shadow hover:shadow-md dark:border-slate-700">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            {showStudent ? <th className="px-4 py-3">Student</th> : null}
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Marked by</th>
            {(onEdit || onDelete) && <th className="px-4 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((r) => {
            const meta = statusMeta(r.status)
            const isToday = r.date === t
            return (
              <tr
                key={r.id}
                className={`transition-colors ${meta.row} ${isToday ? 'ring-2 ring-inset ring-sky-400/60 dark:ring-sky-500/50' : ''} hover:brightness-[0.98] dark:hover:brightness-110`}
              >
                {showStudent ? (
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.student_name}</td>
                ) : null}
                <td className="px-4 py-3 font-medium tabular-nums text-slate-900 dark:text-slate-100">
                  {r.date}
                  {isToday ? (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
                      Today
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </td>
                <td
                  className="max-w-[240px] truncate px-4 py-3 text-slate-700 dark:text-slate-300"
                  title={r.reason || ''}
                >
                  {r.status === 'PRESENT' ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className="text-sm">{r.reason || '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.marked_by_name || '—'}</td>
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3 text-right">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="mr-1 inline-flex rounded-xl p-2 text-slate-500 transition hover:bg-white/80 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                        aria-label="Edit"
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(r.id)}
                        className="inline-flex rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        aria-label="Delete"
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
