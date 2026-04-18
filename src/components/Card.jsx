/**
 * Content / stat card — soft light surface.
 */
export function Card({
  children,
  className = '',
  accentClass = '',
  padding = true,
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-950/30 dark:hover:shadow-md ${className}`}
    >
      {accentClass ? (
        <div className={`h-1 bg-gradient-to-r ${accentClass}`} />
      ) : null}
      <div className={padding ? 'p-5 sm:p-6' : ''}>{children}</div>
    </div>
  )
}
