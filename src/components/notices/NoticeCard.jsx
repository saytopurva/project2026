import { AlertTriangle, Megaphone, Paperclip, Trash2 } from 'lucide-react'

function formatPosted(iso) {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return iso || ''
  }
}

/**
 * Single notice card with optional important styling and creator-only delete.
 */
export function NoticeCard({ notice, onDelete, deletingId }) {
  const busy = deletingId === notice.id
  const important = Boolean(notice.is_important)

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
        important
          ? 'border-amber-300/90 ring-1 ring-amber-200/60 dark:border-amber-600/70 dark:ring-amber-900/50'
          : 'border-slate-200/90 dark:border-slate-700'
      }`}
    >
      {important ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
          aria-hidden
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
              important
                ? 'bg-amber-50 text-amber-700 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/60'
                : 'bg-sky-50 text-sky-700 ring-sky-100/80 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/60'
            }`}
          >
            {important ? (
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            ) : (
              <Megaphone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {notice.title}
              </h3>
              {important ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                  Important
                </span>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {notice.content}
            </p>
            {notice.attachment_url ? (
              <a
                href={notice.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                Attachment
              </a>
            ) : null}
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">{notice.author_name}</span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {formatPosted(notice.created_at)}
            </p>
          </div>
        </div>

        {notice.is_mine ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(notice.id)}
            title="Delete notice"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-700 dark:border-red-800 dark:border-t-red-300" />
            ) : (
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            )}
            <span className="hidden sm:inline">Delete</span>
          </button>
        ) : null}
      </div>
    </article>
  )
}
