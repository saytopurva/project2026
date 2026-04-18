/**
 * Content / stat card — soft light surface.
 * @param {boolean} [compact] — tighter padding and radius for dense dashboards.
 */
export function Card({
  children,
  className = '',
  accentClass = '',
  padding = true,
  compact = false,
}) {
  const rounded = compact ? 'rounded-xl' : 'rounded-2xl'
  const bodyPad =
    padding === false
      ? ''
      : compact
        ? 'p-3 sm:p-4'
        : 'p-4 sm:p-5'
  return (
    <div
      className={`overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-950/30 dark:hover:shadow-md ${rounded} ${className}`}
    >
      {accentClass ? (
        <div className={`h-0.5 bg-gradient-to-r ${accentClass}`} />
      ) : null}
      <div className={bodyPad}>{children}</div>
    </div>
  )
}
