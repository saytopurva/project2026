import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Search, SlidersHorizontal, UserPlus } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { StudentCard } from '../components/students/StudentCard'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { fetchStudents } from '../services/studentService'

/**
 * Student directory — search, filters, responsive card grid (Django API).
 */
export function StudentsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('all')
  const [rollMin, setRollMin] = useState('')
  const [rollMax, setRollMax] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchStudents()
      setStudents(list)
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        'Could not load students. Is Django running on port 8000?'
      notify.error(msg)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const courseOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.student_class).filter(Boolean))
    return ['all', ...[...set].sort()]
  }, [students])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = rollMin.trim() === '' ? null : parseInt(rollMin, 10)
    const max = rollMax.trim() === '' ? null : parseInt(rollMax, 10)

    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
      const matchesCourse = course === 'all' || s.student_class === course
      const roll = Number(s.roll_no)
      const matchesMin = min === null || Number.isNaN(min) || roll >= min
      const matchesMax = max === null || Number.isNaN(max) || roll <= max
      return matchesSearch && matchesCourse && matchesMin && matchesMax
    })
  }, [students, search, course, rollMin, rollMax])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const apiHint =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'Vite proxy → Django :8000' : 'Configure VITE_API_URL')

  return (
    <DashboardLayout user={user} title="Students" onLogout={handleLogout}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
              Student directory
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Browse and filter enrollments. Data loads from your Django API (
              <span className="font-mono text-xs text-sky-700 dark:text-sky-400">{apiHint}</span>).
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 shadow-sky-500/15"
            onClick={() => navigate('/students/add')}
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Add student
          </Button>
        </div>

        <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                aria-label="Search students"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="flex min-w-[160px] flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Filter className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  Course / class
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
                >
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'all' ? 'All courses' : c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:w-28">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    Roll min
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={rollMin}
                    onChange={(e) => setRollMin(e.target.value)}
                    placeholder="Any"
                    className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:w-28">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Roll max
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={rollMax}
                    onChange={(e) => setRollMax(e.target.value)}
                    placeholder="Any"
                    className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filtered.length}</span> of{' '}
            {students.length} students
            <span className="ml-2 text-slate-400 dark:text-slate-500">
              (Age filters need a DOB field in the API — use roll range as a stand-in.)
            </span>
          </p>
        </Card>

        {loading ? (
          <Loader label="Loading students…" className="py-24" />
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/50 text-center shadow-none dark:border-slate-600 dark:bg-slate-900/50">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No students match your filters.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Clear filters or add a new student to get started.
            </p>
            <Button type="button" variant="secondary" className="mt-6" onClick={() => navigate('/students/add')}>
              Add student
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <StudentCard key={s.id} student={s} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
