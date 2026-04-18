import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card } from '../components/Card'
import { ExamTabs } from '../components/marks/ExamTabs'
import { ResultTable } from '../components/results/ResultTable'
import { TopThreeLeaderboard } from '../components/results/TopThreeLeaderboard'
import { notify } from '../utils/notify'
import { formatApiError } from '../utils/formatApiError'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { fetchClassResults } from '../services/resultsService'
import { fetchExamTypes } from '../services/structuredMarksService'
import { fetchStudentClasses, fetchStudents } from '../services/studentService'
import { sortClassNames } from '../utils/sortClassNames'

const filterSelectCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:[color-scheme:dark] dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40'

export function ResultsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  /** Full student rows for the selected class only (for student filter dropdown). */
  const [classStudentOptions, setClassStudentOptions] = useState([])
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [className, setClassName] = useState('')
  const [examType, setExamType] = useState('UNIT_TEST')
  const [studentFilter, setStudentFilter] = useState('')
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [classList, types] = await Promise.all([fetchStudentClasses(), fetchExamTypes()])
        if (cancelled) return
        setClasses(sortClassNames(Array.isArray(classList) ? classList : []))
        setExamTypes(Array.isArray(types) ? types : [])
        setClassName((prev) => prev || classList[0] || '')
        const list = Array.isArray(types) ? types : []
        setExamType((prev) => {
          if (!list.length) return ''
          return list.some((t) => t.slug === prev) ? prev : list[0].slug
        })
      } catch (e) {
        if (!cancelled) notify.error(formatApiError(e) || 'Could not load filters.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cn = String(className || '').trim()
    if (!cn) {
      setClassStudentOptions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchStudents({ class_name: cn })
        if (!cancelled) setClassStudentOptions(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) {
          notify.error(formatApiError(e) || 'Could not load class roster.')
          setClassStudentOptions([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [className])

  const load = useCallback(async () => {
    const cn = String(className || '').trim()
    const etRaw = String(examType || '').trim()
    const et = examTypes.some((t) => t.slug === etRaw)
      ? etRaw
      : String(examTypes[0]?.slug || '').trim()
    if (!cn || !et) {
      setPayload(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchClassResults({ class_name: cn, exam_type: et })
      setPayload(data)
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load results.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [className, examType, examTypes])

  useEffect(() => {
    load()
  }, [load])

  const students = useMemo(() => payload?.students ?? [], [payload])
  const examSelectValue = examTypes.some((t) => t.slug === examType) ? examType : examTypes[0]?.slug ?? ''

  const studentsInClass = useMemo(
    () =>
      classStudentOptions
        .slice()
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [classStudentOptions],
  )

  const tableStudents = useMemo(() => {
    if (!studentFilter) return students
    const id = Number(studentFilter)
    if (!Number.isFinite(id)) return students
    return students.filter((s) => s.student_id === id)
  }, [students, studentFilter])

  useEffect(() => {
    if (!studentFilter) return
    const stillInClass = studentsInClass.some((s) => String(s.id) === String(studentFilter))
    if (!stillInClass) setStudentFilter('')
  }, [className, studentFilter, studentsInClass])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  return (
    <DashboardLayout user={user} title="Results" onLogout={handleLogout}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Class results</h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Ranks by class and exam · PDF report cards & parent sharing
          </p>
        </div>

        <Card compact className="border-slate-100 dark:border-slate-800">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <div>
              <label
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
                htmlFor="results-class-select"
              >
                Class
              </label>
              <select
                id="results-class-select"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className={filterSelectCls}
              >
                <option value="">Select class…</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
                htmlFor="results-student-select"
              >
                Student
              </label>
              <select
                id="results-student-select"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className={filterSelectCls}
                disabled={!className}
              >
                <option value="">All students</option>
                {studentsInClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Exam type
              </p>
              {examTypes.length ? (
                <ExamTabs
                  activeSlug={examSelectValue || examTypes[0].slug}
                  onChange={(slug) => {
                    if (slug) setExamType(slug)
                  }}
                  examTypes={examTypes}
                  showAllOption={false}
                />
              ) : (
                <p className="text-xs text-slate-500">Loading exam types…</p>
              )}
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
                htmlFor="results-search"
              >
                Search in table
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="results-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by name…"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-3 text-xs text-slate-900 shadow-inner focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                />
              </div>
            </div>
          </div>
        </Card>

        {payload ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {payload.exam_type_label} · Class {payload.class_name} · {students.length} students
              {studentFilter ? ' · filtered view' : ''}
            </p>
            <TopThreeLeaderboard students={students} />
          </div>
        ) : null}

        <Card compact className="border-slate-100 dark:border-slate-800">
          <ResultTable
            students={tableStudents}
            examType={examSelectValue}
            loading={loading}
            search={search}
          />
        </Card>
      </div>
    </DashboardLayout>
  )
}
