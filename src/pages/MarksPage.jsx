import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ExamTabs } from '../components/marks/ExamTabs'
import { EditMarksModal } from '../components/marks/EditMarksModal'
import { MarksChart } from '../components/marks/MarksChart'
import { MarksTable } from '../components/marks/MarksTable'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import {
  createStructuredMark,
  deleteStructuredMark,
  fetchAllMarks,
  fetchExamTypes,
  fetchSubjects,
  updateStructuredMark,
} from '../services/structuredMarksService'
import { fetchStudents } from '../services/studentService'

export function MarksPage() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState('')
  const [examTab, setExamTab] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadMeta = useCallback(async () => {
    const [sList, sub, et] = await Promise.all([
      fetchStudents(),
      fetchSubjects(),
      fetchExamTypes(),
    ])
    setStudents(sList)
    setSubjects(sub)
    setExamTypes(et)
  }, [])

  const loadMarks = useCallback(async () => {
    setLoading(true)
    try {
      const sid = studentId ? Number(studentId) : null
      const list = await fetchAllMarks(sid)
      const filtered = examTab
        ? list.filter((r) => r.exam_type_slug === examTab)
        : list
      setRows(filtered)
    } catch (e) {
      notify.error(
        e?.response?.status === 401
          ? 'Not authorized — log out and sign in again (JWT).'
          : e?.message || 'Could not load marks.'
      )
    } finally {
      setLoading(false)
    }
  }, [studentId, examTab])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    loadMarks()
  }, [loadMarks])

  useEffect(() => {
    if (location?.state?.focus !== 'add-marks') return
    const t = window.setTimeout(() => {
      const el = document.getElementById('marks-student-select')
      if (el && typeof el.focus === 'function') el.focus()
    }, 50)
    return () => window.clearTimeout(t)
  }, [location?.state?.focus])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const onSubmitModal = async (payload) => {
    const { id, ...rest } = payload
    if (id) {
      await updateStructuredMark(id, rest)
      notify.success('Marks updated.')
    } else {
      await createStructuredMark(rest)
      notify.success('Marks saved.')
    }
    await loadMarks()
    await loadMeta()
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this marks entry?')) return
    setBusyId(id)
    try {
      await deleteStructuredMark(id)
      notify.success('Deleted.')
      await loadMarks()
    } catch (e) {
      notify.error(e?.message || 'Delete failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout user={user} title="Marks" onLogout={handleLogout}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Structured marks
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Catalog subjects × exam × date · validation & charts
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add marks
          </Button>
        </div>

        <Card compact className="border-slate-100 dark:border-slate-800">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <div>
              <label
                className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
                htmlFor="marks-student-select"
              >
                Student
              </label>
              <select
                id="marks-student-select"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
              >
                <option value="">All students</option>
                {students.map((s) => (
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
              <ExamTabs activeSlug={examTab} onChange={setExamTab} examTypes={examTypes} />
            </div>
          </div>
        </Card>

        {loading ? (
          <Loader label="Loading marks…" className="py-10" size="sm" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-5 xl:items-start">
            <div className="min-w-0 xl:col-span-3">
              <MarksTable
                rows={rows}
                onEdit={(row) => {
                  setEditing(row)
                  setModalOpen(true)
                }}
                onDelete={onDelete}
                busyId={busyId}
              />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <MarksChart rows={rows} />
            </div>
          </div>
        )}

        <EditMarksModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSubmit={onSubmitModal}
          subjects={subjects}
          examTypes={examTypes}
          initial={editing}
          selectedStudentId={
            studentId ? Number(studentId) : editing?.student != null ? Number(editing.student) : undefined
          }
          students={students}
        />
      </div>
    </DashboardLayout>
  )
}
