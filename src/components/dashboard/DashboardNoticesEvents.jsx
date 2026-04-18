import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, isBefore, startOfToday } from 'date-fns'
import { CalendarDays, ChevronRight, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../Card'
import { fetchEvents } from '../../services/eventService'
import { fetchNotices } from '../../services/noticeService'

function formatEventDate(d) {
  try {
    return format(parseISO(d), 'MMM d')
  } catch {
    return d
  }
}

/**
 * Right column: latest notices + upcoming events (dashboard widget).
 */
export function DashboardNoticesEvents() {
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const today = format(startOfToday(), 'yyyy-MM-dd')
        const end = format(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        const [n, ev] = await Promise.all([
          fetchNotices({ search: '', importantOnly: false }),
          fetchEvents({ search: '', start: today, end, type: '' }),
        ])
        if (!cancelled) {
          setNotices(Array.isArray(n) ? n.slice(0, 4) : [])
          const upcoming = (Array.isArray(ev) ? ev : [])
            .filter((e) => {
              try {
                const d = parseISO(e.date)
                return !isBefore(d, startOfToday())
              } catch {
                return true
              }
            })
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .slice(0, 4)
          setEvents(upcoming)
        }
      } catch {
        if (!cancelled) {
          setNotices([])
          setEvents([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const noticePreview = useMemo(() => notices.slice(0, 3), [notices])
  const eventPreview = useMemo(() => events.slice(0, 3), [events])

  return (
    <Card
      compact
      className="h-full border-slate-200/90 shadow-sm ring-1 ring-slate-200/40 dark:border-slate-800 dark:ring-slate-800/60"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Megaphone className="h-3.5 w-3.5 text-violet-500" aria-hidden />
              Notices
            </h3>
            <Link
              to="/notices"
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
            >
              All
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          {loading ? (
            <p className="text-[10px] text-slate-400">Loading…</p>
          ) : noticePreview.length === 0 ? (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">No notices yet.</p>
          ) : (
            <ul className="space-y-2">
              {noticePreview.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-slate-100/90 bg-slate-50/50 px-2.5 py-1.5 dark:border-slate-700/80 dark:bg-slate-800/40"
                >
                  <p className="line-clamp-1 text-[11px] font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                  {n.is_important ? (
                    <span className="mt-0.5 inline-block rounded bg-amber-100/90 px-1 py-px text-[8px] font-bold uppercase text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                      Important
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5 text-sky-500" aria-hidden />
              Upcoming
            </h3>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
            >
              Calendar
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          {loading ? (
            <p className="text-[10px] text-slate-400">Loading…</p>
          ) : eventPreview.length === 0 ? (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {eventPreview.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-slate-100/90 bg-slate-50/50 px-2.5 py-1.5 dark:border-slate-700/80 dark:bg-slate-800/40"
                >
                  <p className="text-[10px] font-medium text-sky-600 dark:text-sky-400">{formatEventDate(e.date)}</p>
                  <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-800 dark:text-slate-100">
                    {e.title}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
