import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, LayoutGrid, List } from 'lucide-react'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { formatApiError } from '../utils/formatApiError'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import {
  assignSubstitution,
  fetchFreeSlotsToday,
  fetchSubstitutionsToday,
  fetchTodaySchedule,
  fetchWeeklySchedule,
} from '../services/scheduleService'
import { DailySchedule } from '../components/schedule/DailySchedule'
import { FreeSlots } from '../components/schedule/FreeSlots'
import { SubstitutionPanel } from '../components/schedule/SubstitutionPanel'

function dayLabel(code) {
  const map = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' }
  return map[code] || code
}

export function SchedulePage() {
  const { user, logout, rbac } = useAuth()
  const navigate = useNavigate()
  const role = rbac?.role || user?.role || ''
  const prevSubsRef = useRef(null)

  const [view, setView] = useState('daily') // daily | weekly
  const [today, setToday] = useState(null)
  const [week, setWeek] = useState(null)
  const [free, setFree] = useState(null)
  const [subs, setSubs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assignBusy, setAssignBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, f, s] = await Promise.all([
        fetchTodaySchedule(),
        fetchFreeSlotsToday(),
        fetchSubstitutionsToday(),
      ])
      setToday(t)
      setFree(f)
      setSubs(s)
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load schedule.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Notifications:
  // - "You have free lecture now" (once per day)
  // - "Substitution assigned" when a pending item becomes assigned to this user
  useEffect(() => {
    if (!free?.free_slots) return
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const inSlot = (s) => {
      const [sh, sm] = String(s.start_time).split(':')
      const [eh, em] = String(s.end_time).split(':')
      const start = Number(sh) * 60 + Number(sm)
      const end = Number(eh) * 60 + Number(em)
      return nowMin >= start && nowMin < end
    }
    const hasFreeNow = free.free_slots.some(inSlot)
    if (hasFreeNow) {
      const key = `sms_free_now_${free.date || 'today'}`
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        notify.info('You have a free lecture now.')
      }
    }
  }, [free])

  useEffect(() => {
    const items = subs?.items || []
    const prev = prevSubsRef.current
    prevSubsRef.current = items
    if (!prev || !user?.email) return
    const prevById = new Map(prev.map((x) => [x.id, x]))
    for (const it of items) {
      const was = prevById.get(it.id)
      const justAssignedToMe =
        it.status === 'ASSIGNED' &&
        (it.substitute_teacher?.email || '') === user.email &&
        (was?.substitute_teacher?.email || '') !== user.email
      if (justAssignedToMe) {
        notify.success('Substitution assigned to you.')
        break
      }
    }
  }, [subs, user?.email])

  useEffect(() => {
    if (view !== 'weekly') return
    let cancelled = false
    ;(async () => {
      try {
        const w = await fetchWeeklySchedule()
        if (!cancelled) setWeek(w)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [view])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const dateLabel = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }, [])

  const acceptSub = async (row) => {
    setAssignBusy(true)
    try {
      await assignSubstitution({ substitution_id: row.id })
      notify.success('Substitution accepted.')
      await load()
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not accept substitution.')
    } finally {
      setAssignBusy(false)
    }
  }

  const assignSub = async () => {
    notify.info('Assign flow UI can be added next (teacher picker).')
  }

  return (
    <DashboardLayout user={user} title="Schedule" onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Class schedule
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              View your day, free lectures, and substitutions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewButton active={view === 'daily'} onClick={() => setView('daily')} icon={List}>
              Daily
            </ViewButton>
            <ViewButton active={view === 'weekly'} onClick={() => setView('weekly')} icon={LayoutGrid}>
              Weekly
            </ViewButton>
          </div>
        </div>

        {loading ? (
          <Loader label="Loading schedule…" className="py-20" />
        ) : (
          <>
            {view === 'daily' ? (
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                  <DailySchedule
                    title="Today"
                    dateLabel={dateLabel}
                    slots={today?.slots || []}
                  />
                  <SubstitutionPanel
                    items={subs?.items || []}
                    role={role}
                    busy={assignBusy}
                    onAccept={acceptSub}
                    onAssign={assignSub}
                  />
                </div>
                <div className="space-y-6 lg:col-span-4">
                  <FreeSlots freeSlots={free?.free_slots || []} />
                  <Card className="border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
                        <CalendarDays className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Notifications
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          We’ll alert you when you have a free lecture now or when a substitution is assigned.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {(week?.days || []).map((d) => (
                  <DailySchedule
                    key={d.day}
                    title={dayLabel(d.day)}
                    dateLabel={d.date}
                    slots={d.slots || []}
                  />
                ))}
                {!week?.days?.length ? (
                  <Card>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Weekly view is empty until schedule slots are created in admin.
                    </p>
                  </Card>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function ViewButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
        active
          ? 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900/40 dark:bg-primary-950/30 dark:text-primary-200'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
      ].join(' ')}
      aria-pressed={active}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  )
}

