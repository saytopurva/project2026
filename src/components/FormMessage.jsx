import { AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * Inline success / error banner for forms (works alongside toasts).
 */
export function FormMessage({ type = 'error', message }) {
  if (!message) return null
  const isOk = type === 'success'
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        isOk
          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100'
          : 'border-red-200/80 bg-red-50/90 text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100'
      }`}
    >
      {isOk ? (
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
      )}
      <p className="leading-relaxed">{message}</p>
    </div>
  )
}
