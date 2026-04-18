import { Medal } from 'lucide-react'

/**
 * Top 3 students by rank for current class result list.
 */
export function TopThreeLeaderboard({ students }) {
  const top = (students || [])
    .filter((s) => s.rank != null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)

  if (top.length === 0) return null

  const colors = [
    'from-amber-400/90 to-amber-600 shadow-amber-500/20',
    'from-slate-300 to-slate-500 shadow-slate-400/20',
    'from-orange-300 to-orange-600 shadow-orange-500/20',
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {top.map((s, i) => (
        <div
          key={s.student_id}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-3 text-white shadow-lg ${colors[i] || 'from-slate-400 to-slate-600'}`}
        >
          <Medal className="absolute right-2 top-2 h-8 w-8 opacity-30" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
            {i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'} place
          </p>
          <p className="mt-1 truncate text-sm font-bold">{s.name}</p>
          <p className="mt-0.5 text-[11px] opacity-90 tabular-nums">
            {typeof s.percentage === 'number' ? s.percentage.toFixed(1) : s.percentage}% · {s.grade}
          </p>
        </div>
      ))}
    </div>
  )
}
