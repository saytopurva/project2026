import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { InputField } from '../InputField'
import { createAttendance } from '../../services/attendanceApi'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'

const selectClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:[color-scheme:dark] dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40'

/**
 * @param {object} props
 * @param {Array<{ id: number, name: string, student_class?: string }>} props.students
 * @param {number | string | null} [props.fixedStudentId] — if set, hide student select
 * @param {string} [props.studentSelectId] — html id for focus (dashboard shortcut)
 * @param {(created: object) => void} [props.onSuccess]
 */
export function MarkAttendanceForm({
  students = [],
  fixedStudentId = null,
  studentSelectId = 'att-student',
  onSuccess,
}) {
  const [studentId, setStudentId] = useState(fixedStudentId != null ? String(fixedStudentId) : '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('PRESENT')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const sid = fixedStudentId != null ? String(fixedStudentId) : studentId

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sid) {
      notify.error('Choose a student.')
      return
    }
    if ((status === 'ABSENT' || status === 'LEAVE') && !reason.trim()) {
      notify.error('Reason is required for Absent or Leave.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        student: Number(sid),
        date,
        status,
        reason: status === 'PRESENT' ? '' : reason.trim(),
      }
      const created = await createAttendance(payload)
      notify.success('Attendance saved.')
      setReason('')
      onSuccess?.(created)
    } catch (err) {
      notify.error(formatApiError(err) || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const showReason = status === 'ABSENT' || status === 'LEAVE'

  return (
    <Card className="border-slate-100 shadow-md shadow-slate-200/40 transition hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mark attendance</h3>
      </div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {fixedStudentId == null ? (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor={studentSelectId}
            >
              Student
            </label>
            <select
              id={studentSelectId}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Class {s.student_class})
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <InputField id="att-date" label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="w-full text-left">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LEAVE">Leave</option>
          </select>
        </div>
        {showReason ? (
          <div className="w-full text-left">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:ring-sky-900/40"
              placeholder="Required for Absent or Leave…"
            />
          </div>
        ) : null}
        <Button type="submit" variant="primary" fullWidth loading={saving}>
          Save attendance
        </Button>
      </form>
    </Card>
  )
}
