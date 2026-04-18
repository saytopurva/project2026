import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { InputField } from '../InputField'
import { notify } from '../../utils/notify'
import {
  createAttendance,
  deleteAttendance,
  downloadAttendanceCsv,
  fetchAttendanceByStudent,
  updateAttendance,
} from '../../services/attendanceService'

const STATUS_META = {
  PRESENT: { label: 'Present', className: 'bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50' },
  ABSENT: { label: 'Absent', className: 'bg-rose-100 text-rose-900 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50' },
  LEAVE: { label: 'Leave', className: 'bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50' },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.ABSENT
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${m.className}`}>
      {m.label}
    </span>
  )
}

/**
 * Full attendance table + mark/edit/delete + filters + % bar for a single student.
 */
export function StudentAttendanceSection({ studentId }) {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [pct, setPct] = useState(0)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [statusFilter, setStatusFilter] = useState('all')

  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formStatus, setFormStatus] = useState('PRESENT')
  const [formReason, setFormReason] = useState('')
  const [saving, setSaving] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editStatus, setEditStatus] = useState('PRESENT')
  const [editReason, setEditReason] = useState('')

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const params = { month }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await fetchAttendanceByStudent(studentId, params)
      setResults(data.results || [])
      setPct(typeof data.attendance_percentage === 'number' ? data.attendance_percentage : 0)
    } catch (e) {
      notify.error(e?.response?.data?.detail || e?.message || 'Could not load attendance.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [studentId, month, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const lowAttendance = pct < 75 && results.length > 0

  const handleCreate = async (e) => {
    e.preventDefault()
    if (formStatus === 'LEAVE' && !formReason.trim()) {
      notify.error('Please enter a leave reason.')
      return
    }
    setSaving(true)
    try {
      await createAttendance({
        student: Number(studentId),
        date: formDate,
        status: formStatus,
        leave_reason: formStatus === 'LEAVE' ? formReason.trim() : '',
      })
      notify.success('Attendance saved.')
      setFormReason('')
      await load()
    } catch (err) {
      const d = err?.response?.data
      notify.error(typeof d === 'object' ? JSON.stringify(d) : err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (r) => {
    setEditId(r.id)
    setEditDate(r.date)
    setEditStatus(r.status)
    setEditReason(r.leave_reason || '')
  }

  const cancelEdit = () => {
    setEditId(null)
  }

  const saveEdit = async () => {
    if (!editId) return
    if (editStatus === 'LEAVE' && !editReason.trim()) {
      notify.error('Leave reason is required.')
      return
    }
    try {
      await updateAttendance(editId, {
        date: editDate,
        status: editStatus,
        leave_reason: editStatus === 'LEAVE' ? editReason.trim() : '',
      })
      notify.success('Updated.')
      setEditId(null)
      await load()
    } catch (err) {
      const d = err?.response?.data
      notify.error(typeof d === 'object' ? JSON.stringify(d) : err?.message || 'Update failed.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return
    try {
      await deleteAttendance(id)
      notify.success('Deleted.')
      await load()
    } catch (e) {
      notify.error(e?.message || 'Delete failed.')
    }
  }

  const handleExport = async () => {
    try {
      await downloadAttendanceCsv({
        student: studentId,
        month,
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      })
    } catch {
      notify.error('Could not download CSV.')
    }
  }

  return (
    <div className="space-y-6">
      {lowAttendance ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold">Attendance is below 75% for this period</p>
            <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
              Consider following up with the student or guardians.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-100 shadow-md dark:border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Attendance rate</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Based on filtered records (Present ÷ total days recorded).
              </p>
            </div>
            <span className="text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-300">{pct}%</span>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </Card>
        <Card className="border-slate-100 shadow-md dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filters</p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="all">All</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
              </select>
            </div>
            <Button type="button" variant="secondary" className="w-full" onClick={handleExport}>
              <Download className="h-4 w-4" aria-hidden />
              CSV
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-100 shadow-md dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Mark attendance</h3>
          </div>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <InputField
              id="attn-date"
              label="Date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <div className="w-full text-left">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
              </select>
            </div>
            {formStatus === 'LEAVE' ? (
              <div className="w-full text-left">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Leave reason
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100"
                  placeholder="Reason for leave…"
                />
              </div>
            ) : null}
            <Button type="submit" fullWidth loading={saving}>
              Save
            </Button>
          </form>
        </Card>

        <Card className="border-slate-100 shadow-md dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Records</h3>
          </div>
          {loading ? (
            <p className="mt-6 text-sm text-slate-500">Loading…</p>
          ) : results.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No attendance for this filter.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Leave reason</th>
                    <th className="px-4 py-3">Marked by</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {results.map((r) => (
                    <tr key={r.id} className="bg-white dark:bg-slate-900/40">
                      {editId === r.id ? (
                        <>
                          <td className="px-4 py-3 align-top">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                            >
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="LEAVE">Leave</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <textarea
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              rows={2}
                              className="w-full resize-none rounded-xl border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{r.marked_by_name || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <Button type="button" variant="secondary" className="px-3 py-1 text-xs" onClick={cancelEdit}>
                              Cancel
                            </Button>
                            <Button type="button" className="ml-2 px-3 py-1 text-xs" onClick={saveEdit}>
                              Save
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{r.date}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td
                            className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-300"
                            title={r.leave_reason || ''}
                          >
                            {r.status === 'LEAVE' ? r.leave_reason || '—' : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.marked_by_name || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => startEdit(r)}
                              className="inline-flex rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="inline-flex rounded-xl p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
