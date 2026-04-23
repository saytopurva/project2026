import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AttendanceSnapshot } from '../components/dashboard/AttendanceSnapshot'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { DashboardInsightsStrip } from '../components/dashboard/DashboardInsightsStrip'
import { DashboardPageSkeleton } from '../components/dashboard/DashboardPageSkeleton'
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard'
import {
  IconAlertAttendance,
  IconAttendance,
  IconTrophy,
  IconUsers,
} from '../components/dashboard/icons'
import { QuickActionsBar } from '../components/dashboard/QuickActionsBar'
import { RecentActivityPanel } from '../components/dashboard/RecentActivityPanel'
import { Card } from '../components/Card'
import { notify } from '../utils/notify'
import { formatApiError } from '../utils/formatApiError'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { rbacNavFlags } from '../utils/rbac'
import { fetchDashboardOverview } from '../services/dashboardService'
import { fetchSubjectPerformance } from '../services/subjectPerformanceService'

/**
 * Premium SMS admin dashboard: KPIs, analytics grid, notices/events, insights, activity.
 */
export function DashboardPage() {
  const { user, logout } = useAuth()
  const nav = useMemo(() => rbacNavFlags(user?.rbac), [user?.rbac])
  const isSubjectTeacher = user?.rbac?.role === 'subject_teacher'
  const teacherSubjects = user?.rbac?.assigned_subject_names || []
  const teacherClasses = user?.rbac?.assigned_classes || []
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [insight, setInsight] = useState({ bestSubject: null, weakSubject: null })

  useEffect(() => {
    let cancelled = false
    const load = async (silent = false) => {
      if (!silent) setLoading(true)
      setLoadError('')
      try {
        const overview = await fetchDashboardOverview()
        if (!cancelled) setData(overview)
      } catch (e) {
        const msg = formatApiError(e) || 'Could not load dashboard.'
        if (!cancelled) {
          setLoadError(msg)
          if (!silent) notify.error(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load(false)
    const id = window.setInterval(() => load(true), 30000)
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => {
    if (!data?.students?.length) {
      setInsight({ bestSubject: null, weakSubject: null })
      return
    }
    const classes = [
      ...new Set(data.students.map((s) => s.className).filter(Boolean)),
    ].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    const cn = classes[0]
    if (!cn) return
    let cancelled = false
    fetchSubjectPerformance({ class_name: String(cn), exam_type: 'UNIT_TEST' })
      .then((r) => {
        if (cancelled) return
        setInsight({
          bestSubject: r?.summary?.best_subject ?? null,
          weakSubject: r?.summary?.weakest_subject ?? null,
        })
      })
      .catch(() => {
        if (!cancelled) setInsight({ bestSubject: null, weakSubject: null })
      })
    return () => {
      cancelled = true
    }
  }, [data?.students])

  const classOptions = useMemo(() => {
    if (!data?.students?.length) return [{ value: 'all', label: 'All classes' }]
    const set = new Set(data.students.map((s) => s.className))
    return [
      { value: 'all', label: 'All classes' },
      ...[...set].sort().map((c) => ({ value: c, label: `Class ${c}` })),
    ]
  }, [data?.students])

  const filteredStudents = useMemo(() => {
    if (!data?.students) return []
    const q = searchQuery.trim().toLowerCase()
    return data.students.filter((s) => {
      const classOk = classFilter === 'all' || s.className === classFilter
      const nameOk = !q || s.name.toLowerCase().includes(q)
      return classOk && nameOk
    })
  }, [data?.students, searchQuery, classFilter])

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    []
  )

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const onAddStudent = useCallback(() => {
    navigate('/students/add')
  }, [navigate])
  const onMarkAttendance = useCallback(() => {
    navigate('/attendance/class')
  }, [navigate])
  const onAddMarks = useCallback(() => {
    navigate('/marks', { state: { focus: 'add-marks' } })
  }, [navigate])

  const lowAttendanceTotal =
    data?.todayAttendance != null
      ? (data.todayAttendance.absent ?? 0) + (data.todayAttendance.leave ?? 0)
      : 0

  const headerSearch = useMemo(
    () => ({
      value: searchQuery,
      onChange: setSearchQuery,
      placeholder: 'Search students…',
    }),
    [searchQuery],
  )

  return (
    <DashboardLayout
      user={user}
      title="Dashboard"
      onLogout={handleLogout}
      headerSearch={headerSearch}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {user?.name || 'Admin'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {user?.rbac?.rbac_label || 'School operations overview'}
            </p>
            {isSubjectTeacher ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                  {teacherSubjects.length ? `${teacherSubjects.join(', ')} Teacher` : 'Subject Teacher'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Classes: {teacherClasses.length ? teacherClasses.join(', ') : '—'}
                </span>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Class
              </label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Filter by class"
              >
                {classOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <QuickActionsBar
            onMarkAttendance={onMarkAttendance}
            onAddStudent={onAddStudent}
            onAddMarks={onAddMarks}
            showAttendance={nav.showAttendance}
            showAddStudent={nav.showAddStudent}
          />
        </div>

        {loading ? (
          <DashboardPageSkeleton />
        ) : loadError ? (
          <Card accentClass="from-red-500 to-rose-600">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{loadError}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Try refreshing the page.</p>
          </Card>
        ) : (
          <>
            {searchQuery.trim() || classFilter !== 'all' ? (
              <Card compact className="border-slate-200/90 transition-opacity duration-300 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Matching students</h4>
                  <span className="text-[10px] text-slate-500">{filteredStudents.length} found</span>
                </div>
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredStudents.length === 0 ? (
                    <li className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      No students match your filters.
                    </li>
                  ) : (
                    filteredStudents.slice(0, 10).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Class {s.className}-{s.section}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            ) : null}

            <div
              className={`grid gap-3 sm:grid-cols-2 ${
                nav.showAttendance ? 'xl:grid-cols-4' : 'xl:grid-cols-2'
              }`}
            >
              <DashboardStatCard
                title="Total students"
                value={data.totalStudents.toLocaleString()}
                subtitle="Enrolled"
                icon={IconUsers}
                accent={{
                  iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-600',
                  blob: 'bg-violet-400',
                }}
              />
              {nav.showAttendance ? (
                <DashboardStatCard
                  title="Avg attendance"
                  value={`${data.attendancePercent}%`}
                  subtitle="Last 30 days"
                  icon={IconAttendance}
                  accent={{
                    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
                    blob: 'bg-emerald-400',
                  }}
                />
              ) : null}
              <DashboardStatCard
                title="Best subject"
                value={insight.bestSubject || '—'}
                subtitle="Unit test · 1st class"
                icon={IconTrophy}
                accent={{
                  iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
                  blob: 'bg-amber-300',
                }}
              />
              {nav.showAttendance ? (
                <DashboardStatCard
                  title="Attendance alerts"
                  value={String(lowAttendanceTotal)}
                  subtitle="Absent + leave today"
                  icon={IconAlertAttendance}
                  accent={{
                    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
                    blob: 'bg-rose-400',
                    valueClass:
                      lowAttendanceTotal > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-900 dark:text-slate-100',
                  }}
                />
              ) : null}
            </div>

            <DashboardInsightsStrip
              weakSubject={insight.weakSubject}
              lowAttendanceCount={lowAttendanceTotal}
              onNavigateMarks={() => navigate('/marks')}
              onNavigateAttendance={() => navigate('/attendance/class')}
              includeAttendance={nav.showAttendance}
            />

            <div className="grid gap-4 xl:grid-cols-12">
              <div className="xl:col-span-12">
                <DashboardCharts />
              </div>
            </div>

            <div
              className={`grid gap-4 ${nav.showAttendance ? 'lg:grid-cols-2' : ''}`}
            >
              {nav.showAttendance ? (
                <AttendanceSnapshot
                  present={data.todayAttendance.present}
                  absent={data.todayAttendance.absent}
                  leave={data.todayAttendance.leave ?? 0}
                  dateLabel={todayLabel}
                />
              ) : null}
              <RecentActivityPanel items={data.recentActivity} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
