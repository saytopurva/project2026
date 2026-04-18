import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { InputField } from '../components/InputField'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { createMark, fetchMarks } from '../services/marksService'
import { fetchStudents } from '../services/studentService'

/**
 * Marks entry + history (Django JWT required).
 */
export function MarksPage() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [marksValue, setMarksValue] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sList, mList] = await Promise.all([
        fetchStudents(),
        fetchMarks(),
      ])
      setStudents(sList)
      setMarks(mList)
    } catch (e) {
      notify.error(
        e?.response?.status === 401
          ? 'Not authorized — log out and sign in again (JWT).'
          : e?.message || 'Could not load marks.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (location?.state?.focus !== 'add-marks') return
    const t = window.setTimeout(() => {
      const el =
        document.getElementById('mk-student') ||
        document.getElementById('mk-subject')
      if (el && typeof el.focus === 'function') el.focus()
    }, 50)
    return () => window.clearTimeout(t)
  }, [location?.state?.focus])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!studentId || !subject.trim()) {
      notify.error('Choose a student and enter a subject.')
      return
    }
    const m = parseInt(marksValue, 10)
    if (Number.isNaN(m)) {
      notify.error('Marks must be a number (0–100).')
      return
    }
    setSaving(true)
    try {
      await createMark({
        student: Number(studentId),
        subject: subject.trim(),
        marks: m,
      })
      notify.success('Marks saved.')
      setSubject('')
      setMarksValue('')
      await load()
    } catch (e) {
      const msg =
        e?.response?.data && typeof e.response.data === 'object'
          ? JSON.stringify(e.response.data)
          : e?.message || 'Save failed'
      notify.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout user={user} title="Marks" onLogout={handleLogout}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Marks
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Add subject scores per student (validated 0–100 on the server).
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add marks</h3>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor="mk-student"
                >
                  Student
                </label>
                <select
                  id="mk-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                >
                  <option value="">Select…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <InputField
                id="mk-subject"
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
              />
              <InputField
                id="mk-value"
                label="Marks (0–100)"
                type="number"
                min={0}
                max={100}
                value={marksValue}
                onChange={(e) => setMarksValue(e.target.value)}
              />
              <Button type="submit" variant="primary" fullWidth loading={saving}>
                Save marks
              </Button>
            </form>
          </Card>

          <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All entries</h3>
            {loading ? (
              <Loader label="Loading…" className="py-12" />
            ) : marks.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No marks yet.</p>
            ) : (
              <ul className="mt-4 max-h-[480px] divide-y divide-slate-100 overflow-auto dark:divide-slate-700">
                {marks.map((row) => (
                  <li
                    key={row.id}
                    className="py-3 text-sm transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {row.student_name} — {row.subject}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Score: {row.marks}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
