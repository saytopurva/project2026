import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, format, parseISO } from 'date-fns'
import { Search, SlidersHorizontal } from 'lucide-react'
import { AddEventForm } from '../components/calendar/AddEventForm'
import { CalendarView } from '../components/calendar/CalendarView'
import { EventList } from '../components/calendar/EventList'
import { EVENT_TYPES, getEventTypeMeta } from '../components/calendar/eventTypeMeta'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { deleteEvent, fetchEvents } from '../services/eventService'

function dateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function CalendarPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [type, setType] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 320)
    return () => clearTimeout(t)
  }, [search])

  const monthRange = useMemo(() => {
    // Fetch a generous range (today +/- 60 days) so navigating feels instant.
    // Server filtering is optional; this is just to avoid huge lists if DB grows.
    const base = selectedDate
    const start = dateKey(addDays(base, -60))
    const end = dateKey(addDays(base, 60))
    return { start, end }
  }, [selectedDate])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchEvents({
        search: debouncedSearch,
        start: monthRange.start,
        end: monthRange.end,
        type,
      })
      setEvents(list)
    } catch (e) {
      const msg =
        e?.response?.status === 401
          ? 'Not authorized — log out and sign in again (JWT).'
          : e?.response?.data?.detail || e?.message || 'Could not load events.'
      notify.error(String(msg))
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, monthRange.end, monthRange.start, type])

  useEffect(() => {
    load()
  }, [load])

  const eventsByDate = useMemo(() => {
    const map = new Map()
    for (const ev of events) {
      const key = ev.date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    }
    return map
  }, [events])

  const selectedKey = useMemo(() => dateKey(selectedDate), [selectedDate])
  const selectedEvents = useMemo(() => {
    const list = eventsByDate.get(selectedKey) || []
    return [...list].sort((a, b) => {
      // stable-ish: created_at desc
      return String(b.created_at).localeCompare(String(a.created_at))
    })
  }, [eventsByDate, selectedKey])

  const upcoming = useMemo(() => {
    const today = dateKey(new Date())
    const end = dateKey(addDays(new Date(), 14))
    const list = events.filter((e) => e.date >= today && e.date <= end)
    return list.sort((a, b) => (a.date === b.date ? String(a.created_at).localeCompare(String(b.created_at)) : a.date.localeCompare(b.date)))
  }, [events])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const onCreated = useCallback(
    () => {
      notify.success('Event added.')
      load()
    },
    [load]
  )

  const onDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteEvent(id)
      notify.info('Event deleted.')
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        'Could not delete event.'
      notify.error(String(msg))
    } finally {
      setDeletingId(null)
    }
  }, [])

  return (
    <DashboardLayout user={user} title="Calendar" onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            School calendar
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Manage school events, PTMs, holidays, and exams. Click a date to see items for that day.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <AddEventForm defaultDate={selectedDate} onCreated={onCreated} />

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upcoming (14 days)</h3>
              {!upcoming.length ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No upcoming events.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {upcoming.slice(0, 8).map((ev) => {
                    const meta = getEventTypeMeta(ev.event_type)
                    return (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs transition hover:bg-white dark:border-slate-700/80 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{ev.title}</p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {format(parseISO(ev.date), 'MMM d')} · {meta.label}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${meta.colorClass}`}>
                          {meta.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm text-slate-900 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                  aria-label="Search events"
                />
              </div>

              <label className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-sky-200 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-sky-700">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" strokeWidth={1.75} aria-hidden />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-200"
                  aria-label="Filter by type"
                >
                  <option value="">All types</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {getEventTypeMeta(t).label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <CalendarView value={selectedDate} onChange={setSelectedDate} eventsByDate={eventsByDate} />

            <EventList
              dateKeyValue={selectedKey}
              events={loading ? [] : selectedEvents}
              deletingId={deletingId}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

