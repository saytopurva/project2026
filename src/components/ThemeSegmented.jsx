import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

/**
 * Light / System / Dark switch. Use `variant="compact"` in tight headers (icons only).
 */
export function ThemeSegmented({ className = '', variant = 'default' }) {
  const { preference, setPreference } = useTheme()
  const compact = variant === 'compact'

  const segBtn = compact
    ? 'flex flex-1 items-center justify-center rounded-md px-1.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 sm:px-2'
    : 'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 sm:px-3'

  const item = (key, Icon, label) => {
    const active = preference === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => setPreference(key)}
        aria-pressed={active}
        title={label}
        aria-label={label}
        className={`${segBtn} ${
          active
            ? 'bg-white text-sky-800 shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-700 dark:text-sky-200 dark:ring-slate-600'
            : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
        {!compact ? <span className="hidden sm:inline">{label}</span> : null}
      </button>
    )
  }

  const shell = compact
    ? 'inline-flex w-[104px] shrink-0 rounded-lg border border-slate-200/90 bg-slate-100/90 p-0.5 dark:border-slate-600 dark:bg-slate-800/90'
    : 'flex w-full max-w-[220px] rounded-xl border border-slate-200/90 bg-slate-100/90 p-0.5 dark:border-slate-600 dark:bg-slate-800/90'

  return (
    <div className={`${shell} ${className}`} role="group" aria-label="Theme">
      {item('light', Sun, 'Light theme')}
      {item('system', Laptop, 'Match system')}
      {item('dark', Moon, 'Dark theme')}
    </div>
  )
}
