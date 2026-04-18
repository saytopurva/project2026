import { ClipboardList } from 'lucide-react'
import { NoticeCard } from './NoticeCard'

/**
 * Grid of notice cards with empty state.
 */
export function NoticeList({ notices, onDeleteNotice, deletingId, loading }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/50"
          />
        ))}
      </div>
    )
  }

  if (!notices.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900/40">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <ClipboardList className="h-7 w-7" strokeWidth={1.5} aria-hidden />
        </span>
        <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">No notices yet</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Post the first announcement for your school, or adjust search / filters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {notices.map((n) => (
        <NoticeCard key={n.id} notice={n} onDelete={onDeleteNotice} deletingId={deletingId} />
      ))}
    </div>
  )
}
