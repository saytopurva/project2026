import { Pencil, Trash2 } from 'lucide-react'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * @param {{ rows: object[], onEdit: (row: object) => void, onDelete: (id: number) => void, busyId?: number | null }} props
 */
export function MarksTable({ rows, onEdit, onDelete, busyId }) {
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
        No marks in this view yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 z-[1] bg-slate-50/95 text-[10px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2">Exam</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Score</th>
            <th className="px-3 py-2">%</th>
            <th className="px-3 py-2">Grade</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((r) => (
            <tr
              key={r.id}
              className="bg-white transition-colors hover:bg-slate-50/80 dark:bg-slate-900/40 dark:hover:bg-slate-800/50"
            >
              <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{r.subject_name}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.exam_type_name || r.exam_type_slug}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.exam_date}</td>
              <td className="px-3 py-2 tabular-nums text-slate-800 dark:text-slate-200">
                {r.marks_obtained} / {r.total_marks}
              </td>
              <td className="px-3 py-2 tabular-nums font-semibold text-sky-700 dark:text-sky-300">{r.percentage}%</td>
              <td className="px-3 py-2">
                <span
                  className={cx(
                    'inline-flex rounded-full px-2 py-px text-[10px] font-bold',
                    Number(r.percentage) >= 60
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
                  )}
                >
                  {r.grade}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => onDelete(r.id)}
                    className="rounded-md p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
