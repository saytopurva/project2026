import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Subject-wise average percentage for current rows.
 * @param {{ rows: Array<{ subject_name: string, percentage: number }> }} props
 */
export function MarksChart({ rows }) {
  const bySubject = new Map()
  for (const r of rows) {
    const name = r.subject_name || 'Unknown'
    const cur = bySubject.get(name) || { name, sum: 0, n: 0 }
    cur.sum += Number(r.percentage) || 0
    cur.n += 1
    bySubject.set(name, cur)
  }
  const data = [...bySubject.values()].map((x) => ({
    name: x.name.length > 14 ? `${x.name.slice(0, 12)}…` : x.name,
    fullName: x.name,
    avg: Math.round((x.sum / x.n) * 10) / 10,
  }))

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Add marks to see a chart.
      </div>
    )
  }

  return (
    <div className="h-[248px] w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
      <p className="mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">Subject avg %</p>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" strokeOpacity={0.45} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} className="fill-slate-500" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={28} className="fill-slate-500" />
          <Tooltip
            formatter={(v) => [`${v}%`, 'Avg']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
            contentStyle={{ borderRadius: 12 }}
          />
          <Bar dataKey="avg" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
