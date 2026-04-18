/**
 * Reusable loading spinner for pages and buttons.
 */
export function Loader({
  label = '',
  fullScreen = false,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-2',
    lg: 'h-12 w-12 border-[3px]',
  }
  const wrap = fullScreen
    ? 'flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950'
    : 'flex flex-col items-center justify-center gap-3 py-8'

  return (
    <div className={`${wrap} ${className}`} role="status" aria-live="polite">
      <div
        className={`animate-spin rounded-full border-slate-200 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400 ${sizes[size]}`}
        aria-hidden
      />
      {label ? <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p> : null}
    </div>
  )
}
