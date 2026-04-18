import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Download, Users } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { InputField } from '../components/InputField'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import {
  bulkAttendance,
  createAttendance,
  downloadAttendanceCsv,
  fetchAttendanceList,
} from '../services/attendanceService'
import { fetchStudents } from '../services/studentService'

const STATUS_STYLE = {
  PRESENT: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  ABSENT: 'bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  LEAVE: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
}

/**
 * School-wide attendance: mark single student, bulk class, list + CSV.
 */
export function AttendancePage() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  const [studentId, setStudentId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('PRESENT')
  const [leaveReason, setLeaveReason] = useState('')

  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterStatus, setFilterStatus] = useState('all')

  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bulkClass, setBulkClass] = useState('all')
  const [bulkStatus, setBulkStatus] = useState('PRESENT')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sList, params] = await Promise.all([
        fetchStudents(),
        Promise.resolve({
          month: filterMonth,
          ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
        }),
      ])
      setStudents(sList)
      const aList = await fetchAttendanceList(params)
      setRecords(aList)
    } catch (e) {
      notify.error(
        e?.response?.status === 401
          ? 'Not authorized — log out and sign in again (JWT).'
          : e?.message || 'Could not load attendance.'
      )
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterStatus])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (location?.state?.focus !== 'mark-attendance') return
    const t = window.setTimeout(() => {
      const el = document.getElementById('att-student')
      if (el && typeof el.focus === 'function') el.focus()
    }, 50)
    return () => window.clearTimeout(t)
  }, [location?.state?.focus])

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.student_class).filter(Boolean))
    return ['all', ...[...set].sort()]
  }, [students])

  const studentsInClass = useMemo(() => {
    if (bulkClass === 'all') return students
    return students.filter((s) => s.student_class === bulkClass)
  }, [students, bulkClass])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!studentId) {
      notify.error('Choose a student.')
      return
    }
    if (status === 'LEAVE' && !leaveReason.trim()) {
      notify.error('Enter a leave reason.')
      return
    }
    setSaving(true)
    try {
      await createAttendance({
        student: Number(studentId),
        date,
        status,
        leave_reason: status === 'LEAVE' ? leaveReason.trim() : '',
      })
      notify.success('Attendance saved.')
      setLeaveReason('')
      await load()
    } catch (err) {
      const d = err?.response?.data
      notify.error(typeof d === 'object' ? JSON.stringify(d) : err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleBulk = async () => {
    if (!studentsInClass.length) {
      notify.error('No students in this class filter.')
      return
    }
    if (bulkStatus === 'LEAVE') {
      notify.error('Bulk mark cannot use Leave (needs individual reasons). Use Present or Absent.')
      return
    }
    setBulkBusy(true)
    try {
      const entries = studentsInClass.map((s) => ({
        student: s.id,
        status: bulkStatus,
        leave_reason: '',
      }))
      const res = await bulkAttendance({ date: bulkDate, entries })
      notify.success(`Updated ${res.updated_ids?.length ?? 0} students.`)
      if (res.errors?.length) console.warn(res.errors)
      await load()
    } catch (e) {
      notify.error(e?.message || 'Bulk save failed.')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleExport = async () => {
    try {
      await downloadAttendanceCsv({
        month: filterMonth,
        ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
      })
    } catch {
      notify.error('Could not download CSV.')
    }
  }

  return (
    <DashboardLayout user={user} title="Attendance" onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Attendance
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Record Present, Absent, or Leave with optional reason. One record per student per day.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mark attendance</h3>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor="att-student"
                >
                  Student
                </label>
                <select
                  id="att-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                >
                  <option value="">Select…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Class {s.student_class})
                    </option>
                  ))}
                </select>
              </div>
              <InputField
                id="att-date"
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <div className="w-full text-left">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>
              {status === 'LEAVE' ? (
                <div className="w-full text-left">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Leave reason
                  </label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100"
                    placeholder="Reason…"
                  />
                </div>
              ) : null}
              <Button type="submit" variant="primary" fullWidth loading={saving}>
                Save attendance
              </Button>
            </form>
          </Card>

          <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bulk (class)</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Mark all students in a class for one day as Present or Absent. For Leave, use single-student form.
            </p>
            <div className="mt-4 space-y-4">
              <InputField
                id="bulk-date"
                label="Date"
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
              />
              <div className="w-full text-left">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Class</label>
                <select
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'all' ? 'All classes' : `Class ${c}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full text-left">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {studentsInClass.length} student{studentsInClass.length === 1 ? '' : 's'} will be updated.
              </p>
              <Button type="button" fullWidth loading={bulkBusy} onClick={handleBulk}>
                Apply to class
              </Button>
            </div>
          </Card>
        </div>

        <Card className="border-slate-100 shadow-md dark:border-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Records</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="all">All statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
              </select>
              <Button type="button" variant="secondary" onClick={handleExport}>
                <Download className="h-4 w-4" aria-hidden />
                CSV
              </Button>
            </div>
          </div>
          {loading ? (
            <Loader label="Loading…" className="py-12" />
          ) : records.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No records for this filter.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Leave reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.student_name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] || ''}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td
                        className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400"
                        title={r.leave_reason || ''}
                      >
                        {r.status === 'LEAVE' ? r.leave_reason || '—' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
