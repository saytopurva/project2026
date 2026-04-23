import { Card } from '../Card'

function toMinutes(t) {
  const [h, m] = String(t).split(':')
  return Number(h) * 60 + Number(m)
}

function formatTime(t) {
  return String(t).slice(0, 5)
}

/**
 * Timetable for a single day.
 * Color coding:
 * - Busy: blue
 * - Current: highlighted ring
 */
export function DailySchedule({ title = 'Today', dateLabel, slots = [] }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const hasSlots = slots.length > 0

  // Timeline bounds: based on data (with padding) but capped to school-like hours.
  const bounds = (() => {
    const fallback = { start: 8 * 60, end: 16 * 60 } // 08:00–16:00
    if (!hasSlots) return fallback
    const starts = slots.map((s) => toMinutes(s.start_time))
    const ends = slots.map((s) => toMinutes(s.end_time))
    const minS = Math.min(...starts)
    const maxE = Math.max(...ends)
    const pad = 30
    const start = Math.max(7 * 60, minS - pad)
    const end = Math.min(18 * 60, maxE + pad)
    return { start, end }
  })()

  const totalMinutes = Math.max(60, bounds.end - bounds.start)

  const hourTicks = []
  const firstHour = Math.floor(bounds.start / 60)
  const lastHour = Math.ceil(bounds.end / 60)
  for (let h = firstHour; h <= lastHour; h++) {
    const m = h * 60
    if (m < bounds.start || m > bounds.end) continue
    hourTicks.push(m)
  }

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          {dateLabel ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {dateLabel}
            </p>
          ) : null}
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          Busy
        </span>
      </div>

      {slots.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
          No classes scheduled.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-xs dark:border-slate-800">
            <div className="flex items-center gap-3">
              <LegendDot className="bg-sky-500" label="Busy" />
              <LegendDot className="bg-emerald-500" label="Free" />
              <LegendDot className="bg-rose-500" label="Substitution" />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Timeline view
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="grid grid-cols-[76px_1fr]">
              {/* Time axis */}
              <div className="relative border-r border-slate-100 bg-slate-50/60 px-2 py-3 dark:border-slate-800 dark:bg-slate-950/20">
                {hourTicks.map((m) => {
                  const top = ((m - bounds.start) / totalMinutes) * 100
                  const hh = String(Math.floor(m / 60)).padStart(2, '0')
                  return (
                    <div
                      key={m}
                      className="absolute left-0 right-0"
                      style={{ top: `${top}%` }}
                    >
                      <div className="flex items-center gap-2 px-2">
                        <span className="w-12 text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                          {hh}:00
                        </span>
                        <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800" />
                      </div>
                    </div>
                  )
                })}

                {/* current time marker */}
                {nowMin >= bounds.start && nowMin <= bounds.end ? (
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: `${((nowMin - bounds.start) / totalMinutes) * 100}%` }}
                    aria-hidden
                  >
                    <div className="flex items-center gap-2 px-2">
                      <span className="w-12 text-[10px] font-bold tabular-nums text-primary-700 dark:text-primary-300">
                        Now
                      </span>
                      <span className="h-px flex-1 bg-primary-400/70" />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Blocks column */}
              <div className="relative h-[420px] p-3">
                {slots.map((row) => {
                  const start = toMinutes(row.start_time)
                  const end = toMinutes(row.end_time)
                  const isNow = nowMin >= start && nowMin < end
                  const top = ((start - bounds.start) / totalMinutes) * 100
                  const height = ((end - start) / totalMinutes) * 100
                  return (
                    <div
                      key={row.id}
                      className={[
                        'absolute left-3 right-3 rounded-2xl border bg-gradient-to-br from-sky-50 to-white p-3 shadow-sm transition',
                        'hover:-translate-y-0.5 hover:shadow-md',
                        'dark:from-sky-950/30 dark:to-slate-900',
                        isNow
                          ? 'border-primary-300 ring-1 ring-inset ring-primary-200 dark:border-primary-600 dark:ring-primary-700/40'
                          : 'border-sky-200/70 dark:border-sky-900/40',
                      ].join(' ')}
                      style={{
                        top: `${top}%`,
                        height: `max(56px, ${height}%)`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                            {formatTime(row.start_time)}–{formatTime(row.end_time)}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {row.class_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">
                            {row.subject?.name || '—'}
                          </p>
                        </div>
                        <span
                          className={[
                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            isNow
                              ? 'bg-primary-600 text-white'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950/55 dark:text-sky-200',
                          ].join(' ')}
                        >
                          {isNow ? 'Now' : 'Busy'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function LegendDot({ className, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} aria-hidden />
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
    </span>
  )
}

