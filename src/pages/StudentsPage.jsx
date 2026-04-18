import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Eye, Search, UserPlus } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { formatApiError } from '../utils/formatApiError'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { fetchStudentClasses, fetchStudents } from '../services/studentService'
import { sortClassNames } from '../utils/sortClassNames'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * Class-wise student directory: API returns only the selected class; tabs switch class.
 */
export function StudentsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingClass, setLoadingClass] = useState(false)
  const [search, setSearch] = useState('')
  const [rollSort, setRollSort] = useState('asc')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      try {
        const list = await fetchStudentClasses()
        if (cancelled) return
        const cls = sortClassNames(Array.isArray(list) ? list : [])
        setClasses(cls)
        if (cls.length) {
          setSelectedClass(cls[0])
        } else {
          setSelectedClass('')
          setStudents([])
        }
      } catch (e) {
        if (!cancelled) {
          notify.error(formatApiError(e) || 'Could not load classes.')
          setClasses([])
          setSelectedClass('')
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cn = String(selectedClass || '').trim()
    if (!cn) {
      setStudents([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingClass(true)
      try {
        const list = await fetchStudents({ class_name: cn })
        if (!cancelled) setStudents(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) {
          notify.error(formatApiError(e) || 'Could not load students.')
          setStudents([])
        }
      } finally {
        if (!cancelled) setLoadingClass(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedClass])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = students
    if (q) {
      rows = rows.filter((s) => {
        const name = String(s.name || '').toLowerCase()
        const div = String(s.division || '').toLowerCase()
        return name.includes(q) || div.includes(q) || String(s.roll_no ?? '').includes(q)
      })
    }
    const mult = rollSort === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => mult * (Number(a.roll_no) - Number(b.roll_no)))
  }, [students, search, rollSort])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const toggleRollSort = useCallback(() => {
    setRollSort((r) => (r === 'asc' ? 'desc' : 'asc'))
  }, [])

  const apiHint =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'Vite proxy → Django :8000' : 'Configure VITE_API_URL')

  return (
    <DashboardLayout user={user} title="Students" onLogout={handleLogout}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              Students
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-slate-600 dark:text-slate-400">
              Browse by class. Data from Django (<span className="font-mono text-[10px] text-sky-700 dark:text-sky-400">{apiHint}</span>).
            </p>
          </div>
          <Button type="button" className="shrink-0" onClick={() => navigate('/students/add')}>
            <UserPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Add student
          </Button>
        </div>

        {loadingMeta ? (
          <Loader label="Loading classes…" className="py-12" size="sm" />
        ) : classes.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/50 text-center dark:border-slate-600 dark:bg-slate-900/50">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No classes yet.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add a student with a class to see tabs here.</p>
            <Button type="button" variant="secondary" className="mt-4" onClick={() => navigate('/students/add')}>
              Add student
            </Button>
          </Card>
        ) : (
          <>
            <div className="border-b border-slate-200/90 dark:border-slate-700">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Class
              </p>
              <div className="-mb-px flex gap-1 overflow-x-auto pb-px">
                {classes.map((c) => {
                  const active = selectedClass === c
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedClass(c)}
                      className={cx(
                        'shrink-0 rounded-t-lg border px-3 py-2 text-xs font-semibold transition',
                        active
                          ? 'border-slate-200 border-b-transparent bg-white text-sky-800 dark:border-slate-600 dark:border-b-transparent dark:bg-slate-900 dark:text-sky-200'
                          : 'border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800',
                      )}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Class {selectedClass || '—'} students
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {loadingClass ? 'Loading…' : `${filtered.length} shown`}
                {search.trim() ? ' (filtered)' : ''}
              </p>
            </div>

            <Card compact className="border-slate-100 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, roll, division…"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                    aria-label="Search in class"
                  />
                </div>
                <button
                  type="button"
                  onClick={toggleRollSort}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {rollSort === 'asc' ? (
                    <ArrowDownNarrowWide className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ArrowUpNarrowWide className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Roll {rollSort === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </Card>

            {loadingClass ? (
              <Loader label="Loading students…" className="py-16" size="sm" />
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-slate-200 bg-slate-50/50 py-10 text-center dark:border-slate-600 dark:bg-slate-900/50">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {students.length === 0 ? 'No students in this class.' : 'No matches for your search.'}
                </p>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/95 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Roll no</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Division</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        className="bg-white hover:bg-slate-50/80 dark:bg-slate-950/40 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-3 py-2 tabular-nums text-slate-800 dark:text-slate-200">{s.roll_no}</td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {s.division ? String(s.division) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/student/${s.id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700"
                          >
                            <Eye className="h-3 w-3" aria-hidden />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
