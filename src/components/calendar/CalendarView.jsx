import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { getEventTypeMeta } from './eventTypeMeta'

function dateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Month calendar with color-coded event dots.
 */
export function CalendarView({ value, onChange, eventsByDate }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
      <Calendar
        value={value}
        onChange={onChange}
        calendarType="gregory"
        tileContent={({ date, view }) => {
          if (view !== 'month') return null
          const key = dateKey(date)
          const list = eventsByDate.get(key) || []
          if (!list.length) return null

          // Show up to 3 dots (one per type) for a quick scan.
          const seen = new Set()
          const dots = []
          for (const ev of list) {
            if (seen.has(ev.event_type)) continue
            seen.add(ev.event_type)
            dots.push(ev)
            if (dots.length >= 3) break
          }

          return (
            <div className="mt-1 flex justify-center gap-1">
              {dots.map((ev) => {
                const meta = getEventTypeMeta(ev.event_type)
                return (
                  <span
                    key={ev.event_type}
                    className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`}
                    aria-hidden
                  />
                )
              })}
              {list.length > 3 ? (
                <span className="ml-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  +{list.length - 3}
                </span>
              ) : null}
            </div>
          )
        }}
      />
    </div>
  )
}

