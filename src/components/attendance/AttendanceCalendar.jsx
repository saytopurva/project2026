import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card } from '../Card'
import { statusMeta } from './constants'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * @param {object} props
 * @param {string} props.month — YYYY-MM
 * @param {Array<{ date: string, status: string }>} props.records — filtered to month
 */
export function AttendanceCalendar({ month, records }) {
  const { year, monthIndex, firstWeekday, daysInMonth, byDay } = useMemo(() => {
    const [y, m] = (month || '').split('-').map(Number)
    const d0 = new Date(y, m - 1, 1)
    const dim = new Date(y, m, 0).getDate()
    // Monday = 0
    let wd = d0.getDay() - 1
    if (wd < 0) wd = 6
    const map = {}
    for (const r of records || []) {
      if (r.date && r.date.startsWith(`${y}-${pad2(m)}`)) {
        const day = Number(r.date.slice(8, 10))
        map[day] = r.status
      }
    }
    return { year: y, monthIndex: m - 1, firstWeekday: wd, daysInMonth: dim, byDay: map }
  }, [month, records])

  const cells = []
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)

  const today = new Date()
  const isToday = (d) =>
    d &&
    today.getFullYear() === year &&
    today.getMonth() === monthIndex &&
    today.getDate() === d

  return (
    <Card className="border-slate-100 shadow-md dark:border-slate-800">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Calendar</h3>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <div key={`e-${i}`} className="aspect-square" />
          const st = byDay[d]
          const meta = st ? statusMeta(st) : null
          const ringToday = isToday(d) ? 'ring-2 ring-sky-400 ring-offset-2 dark:ring-offset-slate-900' : ''
          return (
            <div
              key={d}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-medium transition ${meta ? meta.row : 'bg-slate-50 dark:bg-slate-800/50'} ${ringToday}`}
              title={st ? `${year}-${pad2(monthIndex + 1)}-${pad2(d)}: ${st}` : `${d}`}
            >
              <span className="text-slate-800 dark:text-slate-100">{d}</span>
              {st ? (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    st === 'PRESENT'
                      ? 'bg-emerald-500'
                      : st === 'ABSENT'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                  }`}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
