/**
 * KPI tile — soft cards for the light dashboard.
 */
export function DashboardStatCard({ title, value, subtitle, icon: Icon, accent }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-950/20 ${accent?.ring || ''}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.15] transition-transform duration-500 group-hover:scale-110 ${accent?.blob || 'bg-sky-400'}`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${accent?.iconBg || 'bg-sky-500'}`}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  )
}
