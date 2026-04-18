import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AttendanceSnapshot } from '../components/dashboard/AttendanceSnapshot'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { DashboardSearchBar } from '../components/dashboard/DashboardSearchBar'
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard'
import {
  IconAttendance,
  IconClasses,
  IconMarks,
  IconUsers,
} from '../components/dashboard/icons'
import { QuickActionsPanel } from '../components/dashboard/QuickActionsPanel'
import { RecentActivityPanel } from '../components/dashboard/RecentActivityPanel'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { fetchDashboardOverview } from '../services/dashboardService'

/**
 * Full SMS admin dashboard: KPIs, Recharts, activity, quick actions, search.
 */
export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    const load = async (silent = false) => {
      if (!silent) setLoading(true)
      setLoadError('')
      try {
        const overview = await fetchDashboardOverview()
        if (!cancelled) setData(overview)
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          'Could not load dashboard.'
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
    navigate('/attendance', { state: { focus: 'mark-attendance' } })
  }, [navigate])
  const onAddMarks = useCallback(() => {
    navigate('/marks', { state: { focus: 'add-marks' } })
  }, [navigate])

  return (
    <DashboardLayout user={user} title="Dashboard" onLogout={handleLogout}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Welcome back, {user?.name || 'Admin'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
            Monitor students, attendance, and performance at a glance.
          </p>
        </div>

        {loading ? (
          <Loader label="Loading dashboard…" className="py-20" />
        ) : loadError ? (
          <Card accentClass="from-red-500 to-rose-600">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{loadError}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Try refreshing the page.</p>
          </Card>
        ) : (
          <>
            <DashboardSearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              classFilter={classFilter}
              onClassFilterChange={setClassFilter}
              classOptions={classOptions}
              resultCount={filteredStudents.length}
            />

            {searchQuery.trim() || classFilter !== 'all' ? (
              <Card className="transition-opacity duration-300">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Matching students
                </h4>
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredStudents.length === 0 ? (
                    <li className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No students match your filters.
                    </li>
                  ) : (
                    filteredStudents.slice(0, 8).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Class {s.className}-{s.section}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardStatCard
                title="Total students"
                value={data.totalStudents.toLocaleString()}
                subtitle="Active enrollments"
                icon={IconUsers}
                accent={{
                  iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-500',
                  blob: 'bg-violet-400',
                }}
              />
              <DashboardStatCard
                title="Attendance"
                value={`${data.attendancePercent}%`}
                subtitle="Monthly average"
                icon={IconAttendance}
                accent={{
                  iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
                  blob: 'bg-emerald-400',
                }}
              />
              <DashboardStatCard
                title="Average marks"
                value={`${data.averageMarks}%`}
                subtitle="Across assessments"
                icon={IconMarks}
                accent={{
                  iconBg: 'bg-gradient-to-br from-amber-400 to-orange-400',
                  blob: 'bg-amber-300',
                }}
              />
              <DashboardStatCard
                title="Total classes"
                value={data.totalClasses}
                subtitle="Sections in session"
                icon={IconClasses}
                accent={{
                  iconBg: 'bg-gradient-to-br from-sky-500 to-blue-500',
                  blob: 'bg-sky-400',
                }}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <DashboardCharts
                  attendanceTrend={data.attendanceTrend}
                  marksDistribution={data.marksDistribution}
                  subjectPerformance={data.subjectPerformance}
                />
              </div>
              <div className="space-y-6 xl:col-span-4">
                <QuickActionsPanel
                  onAddStudent={onAddStudent}
                  onMarkAttendance={onMarkAttendance}
                  onAddMarks={onAddMarks}
                />
                <AttendanceSnapshot
                  present={data.todayAttendance.present}
                  absent={data.todayAttendance.absent}
                  leave={data.todayAttendance.leave ?? 0}
                  dateLabel={todayLabel}
                />
              </div>
            </div>

            <RecentActivityPanel items={data.recentActivity} />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
