import { Eye, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ResultActions } from './ResultActions'

function RowTone({ rank, grade }) {
  const r = Number(rank)
  const g = String(grade || '')
  if (r === 1)
    return 'bg-amber-50/90 ring-1 ring-amber-200/60 dark:bg-amber-950/20 dark:ring-amber-900/40'
  if (g === 'F' || (g === 'D' && r > 3))
    return 'bg-rose-50/50 dark:bg-rose-950/15'
  return 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
}

function GradeBadge({ grade }) {
  const g = String(grade || '')
  const tone =
    g.startsWith('A')
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
      : g.startsWith('B')
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
        : g === 'C' || g === 'D'
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
  return <span className={`rounded-full px-2 py-px text-[10px] font-bold ${tone}`}>{g}</span>
}

/**
 * Class results table with rank highlighting and row actions.
 */
export function ResultTable({ students, examType, loading, search }) {
  const navigate = useNavigate()
  const q = (search || '').trim().toLowerCase()
  const rows = !q
    ? students || []
    : (students || []).filter((s) => (s.name || '').toLowerCase().includes(q))

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading results…
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="sticky top-0 z-[1] bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm dark:bg-slate-900/95 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Roll</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Total</th>
            <th className="px-3 py-2">%</th>
            <th className="px-3 py-2">Grade</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                No students or no marks for this class/exam.
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <tr
                key={s.student_id}
                className={`transition-colors ${RowTone({ rank: s.rank, grade: s.grade })}`}
              >
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      s.rank === 1
                        ? 'bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100'
                        : s.rank <= 3
                          ? 'bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {s.rank}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-400">{s.roll_no}</td>
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                <td className="px-3 py-2 tabular-nums text-slate-800 dark:text-slate-200">
                  {s.total_marks_obtained} / {s.total_marks_max}
                </td>
                <td className="px-3 py-2 tabular-nums font-medium text-slate-800 dark:text-slate-200">
                  {typeof s.percentage === 'number' ? s.percentage.toFixed(2) : s.percentage}%
                </td>
                <td className="px-3 py-2">
                  <GradeBadge grade={s.grade} />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/student/${s.student_id}`, { state: { tab: 'results' } })}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Eye className="h-3 w-3" aria-hidden />
                      View
                    </button>
                    <ResultActions studentId={s.student_id} examType={examType} compact />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
