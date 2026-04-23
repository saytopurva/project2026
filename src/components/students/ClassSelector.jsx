import { ArrowRight, ClipboardCheck } from 'lucide-react'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/** Stable pseudo-random percentage per class label (demo). */
function demoAttendancePct(label) {
  const s = String(label || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return 82 + (h % 16) // 82–97
}

/**
 * Premium class selector.
 * - Mobile: horizontal swipeable pills
 * - Desktop: 2-row grid of cards
 *
 * Props:
 * - classes: string[]
 * - selected: string
 * - metaByClass: Record<string, { count?: number, attendancePct?: number }>
 * - onSelect(className)
 * - onOpenClass?(className)
 * - onTakeAttendance?(className)
 */
export function ClassSelector({
  classes,
  selected,
  metaByClass = {},
  onSelect,
  onOpenClass,
  onTakeAttendance,
  sticky = true,
}) {
  return (
    <div
      className={cx(
        sticky
          ? 'sticky top-16 z-10 -mx-4 bg-slate-100/80 px-4 pb-3 pt-3 backdrop-blur dark:bg-slate-950/60 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8'
          : '',
      )}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Class
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Switch instantly (premium chips)
          </p>
        </div>
        <div className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
          Tip: scroll horizontally on mobile
        </div>
      </div>

      {/* Mobile: swipeable pills */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:hidden">
        {classes.map((c) => {
          const active = selected === c
          const meta = metaByClass[c] || {}
          const count = meta.count
          const pct = meta.attendancePct ?? demoAttendancePct(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => onSelect(c)}
              className={cx(
                'shrink-0 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition-all duration-200',
                'active:scale-[0.98]',
                active
                  ? 'border-sky-200 bg-white text-sky-900 shadow-md shadow-sky-900/5 ring-1 ring-sky-100 dark:border-sky-900/40 dark:bg-slate-900 dark:text-sky-100 dark:ring-sky-900/30'
                  : 'border-slate-200 bg-white/70 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900',
              )}
              aria-pressed={active}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{formatClassLabel(c)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {count != null ? `${count}` : '—'}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                {pct}% attendance
              </div>
            </button>
          )
        })}
      </div>

      {/* Desktop/tablet: grid cards (recommended) */}
      <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-5">
        {classes.map((c) => {
          const active = selected === c
          const meta = metaByClass[c] || {}
          const count = meta.count
          const pct = meta.attendancePct ?? demoAttendancePct(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => onSelect(c)}
              className={cx(
                'group relative overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200',
                'active:scale-[0.99]',
                active
                  ? 'border-sky-200 bg-white shadow-lg shadow-sky-900/5 ring-1 ring-sky-100 dark:border-sky-900/40 dark:bg-slate-900 dark:ring-sky-900/30'
                  : 'border-slate-200 bg-white/80 shadow-sm hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900',
              )}
              aria-pressed={active}
            >
              <div
                className={cx(
                  'pointer-events-none absolute -right-8 -top-10 h-20 w-20 rounded-full opacity-20 blur-xl transition-transform duration-300 group-hover:scale-110',
                  active ? 'bg-sky-500' : 'bg-slate-400',
                )}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={cx(
                        'text-sm font-bold',
                        active
                          ? 'text-sky-900 dark:text-sky-100'
                          : 'text-slate-900 dark:text-slate-100',
                      )}
                    >
                      {formatClassLabel(c)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      {pct}% attendance
                    </p>
                  </div>
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                      active
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/55 dark:text-sky-200'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                    )}
                    title="Students (loaded/estimated)"
                  >
                    {count != null ? `${count}` : '—'}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <ActionIconButton
                    label="Open class"
                    onClick={
                      onOpenClass
                        ? (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onOpenClass(c)
                          }
                        : null
                    }
                    icon={ArrowRight}
                    variant={active ? 'active' : 'default'}
                  />
                  <ActionIconButton
                    label="Take attendance"
                    onClick={
                      onTakeAttendance
                        ? (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onTakeAttendance(c)
                          }
                        : null
                    }
                    icon={ClipboardCheck}
                    variant={active ? 'active' : 'default'}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ActionIconButton({ label, onClick, icon: Icon, variant }) {
  const enabled = typeof onClick === 'function'
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'active'
          ? 'border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-900/40 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-slate-800'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800',
      )}
      aria-label={label}
      title={label}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      ) : null}
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}

function formatClassLabel(c) {
  const s = String(c || '').trim()
  // Turn "5" → "5th" (demo premium). Keep "10-A" as-is.
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    const suffix =
      n % 10 === 1 && n % 100 !== 11
        ? 'st'
        : n % 10 === 2 && n % 100 !== 12
          ? 'nd'
          : n % 10 === 3 && n % 100 !== 13
            ? 'rd'
            : 'th'
    return `${n}${suffix}`
  }
  return s
}

