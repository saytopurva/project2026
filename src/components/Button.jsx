/**
 * Rounded action buttons with soft hover motion.
 */
export function Button({
  children,
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

  const variants = {
    primary:
      'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-indigo-500 hover:shadow-lg',
    secondary:
      'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700/80',
    ghost:
      'text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      {children}
    </button>
  )
}
