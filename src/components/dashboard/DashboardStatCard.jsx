/**
 * KPI tile — soft cards for the light dashboard.
 */
export function DashboardStatCard({ title, value, subtitle, icon: Icon, accent }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-950/20 ${accent?.ring || ''}`}
    >
      <div
        className={`pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full opacity-[0.12] transition-transform duration-500 group-hover:scale-110 ${accent?.blob || 'bg-sky-400'}`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 ${accent?.valueClass || ''}`}
          >
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-transform duration-200 group-hover:scale-105 ${accent?.iconBg || 'bg-sky-500'}`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  )
}
