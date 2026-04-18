import { ResultActions } from './ResultActions'

function GradeBadge({ grade }) {
  const g = String(grade || '')
  const tone =
    g.startsWith('A')
      ? 'bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800'
      : g === 'B+' || g === 'B'
        ? 'bg-sky-100 text-sky-900 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800'
        : g === 'C' || g === 'D'
          ? 'bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200'
          : 'bg-rose-100 text-rose-900 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${tone}`}>{g}</span>
  )
}

function RankBadge({ rank, total }) {
  const r = Number(rank)
  const medal =
    r === 1
      ? 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-200'
      : r === 2
        ? 'bg-slate-200 text-slate-800 ring-slate-300 dark:bg-slate-700 dark:text-slate-100'
        : r === 3
          ? 'bg-orange-100 text-orange-900 ring-orange-300 dark:bg-orange-950/40 dark:text-orange-200'
          : 'bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${medal}`}>
      #{rank}
      <span className="font-normal opacity-80">/ {total}</span>
    </span>
  )
}

/**
 * Full result breakdown for one student + exam.
 */
export function ResultDetail({ data, studentId, examType, showActions = true }) {
  if (!data) return null
  const st = data.student
  const subjects = data.subjects || []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {data.exam_type_label}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {st.name} · Class {st.student_class} · Roll {st.roll_no}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RankBadge rank={data.rank} total={data.total_in_class} />
            <GradeBadge grade={data.grade} />
            <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
              {Number(data.percentage ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
        {showActions && studentId && examType ? (
          <ResultActions studentId={studentId} examType={examType} compact />
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Max</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No subject marks for this exam.
                </td>
              </tr>
            ) : (
              subjects.map((s) => (
                <tr key={s.subject} className="bg-white dark:bg-slate-900/40">
                  <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{s.subject}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">{s.marks_obtained}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-400">{s.total_marks}</td>
                  <td className="px-3 py-2 tabular-nums">{typeof s.percentage === 'number' ? s.percentage.toFixed(1) : s.percentage}%</td>
                  <td className="px-3 py-2">
                    <GradeBadge grade={s.grade} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50/90 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800/80">
            <tr>
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 tabular-nums">{data.total_marks_obtained}</td>
              <td className="px-3 py-2 tabular-nums">{data.total_marks_max}</td>
              <td className="px-3 py-2 tabular-nums">{Number(data.percentage).toFixed(2)}%</td>
              <td className="px-3 py-2">
                <GradeBadge grade={data.grade} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {data.teacher_remarks ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Teacher remarks: </span>
          {data.teacher_remarks}
        </div>
      ) : null}
    </div>
  )
}
