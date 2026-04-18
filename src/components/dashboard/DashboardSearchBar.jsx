import { Search } from 'lucide-react'

/**
 * Search + class filter — mock client-side filter on dashboard demo data.
 */
export function DashboardSearchBar({
  query,
  onQueryChange,
  classFilter,
  onClassFilterChange,
  classOptions,
  resultCount,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-3">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search students by name…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
          aria-label="Search students"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={classFilter}
          onChange={(e) => onClassFilterChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
          aria-label="Filter by class"
        >
          {classOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="hidden text-[10px] tabular-nums text-slate-500 dark:text-slate-400 sm:inline">
          {resultCount} match{resultCount === 1 ? '' : 'es'}
        </span>
      </div>
    </div>
  )
}
