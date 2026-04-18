/**
 * Compact loading placeholders for dashboard main content.
 */
export function DashboardPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-lg bg-slate-200/90 dark:bg-slate-800" />
        <div className="h-3 w-full max-w-md rounded bg-slate-100 dark:bg-slate-800/80" />
      </div>
      <div className="h-14 rounded-xl bg-slate-200/70 dark:bg-slate-800/80" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-100 dark:bg-slate-800/80" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="h-72 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 xl:col-span-8" />
        <div className="h-72 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 xl:col-span-4" />
      </div>
      <div className="h-32 rounded-xl bg-slate-200/50 dark:bg-slate-800/50" />
    </div>
  )
}
