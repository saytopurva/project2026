import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { InputField } from '../InputField'
import { bulkAttendance } from '../../services/attendanceApi'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'

const selectClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:[color-scheme:dark] dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40'

/**
 * Per-student row for bulk: default Present; change status and add reason for Absent/Leave.
 * @param {object} props
 * @param {Array<{ id: number, name: string, student_class?: string }>} props.students
 * @param {() => void} [props.onApplied]
 */
export function BulkAttendance({ students = [], onApplied }) {
  const [bulkDate, setBulkDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bulkClass, setBulkClass] = useState('all')
  const [bulkBusy, setBulkBusy] = useState(false)
  /** @type {Record<number, { status: string, reason: string }>} */
  const [rowState, setRowState] = useState({})

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.student_class).filter(Boolean))
    return ['all', ...[...set].sort()]
  }, [students])

  const studentsInClass = useMemo(() => {
    if (bulkClass === 'all') return students
    return students.filter((s) => s.student_class === bulkClass)
  }, [students, bulkClass])

  useEffect(() => {
    setRowState((prev) => {
      const next = { ...prev }
      for (const s of studentsInClass) {
        if (!next[s.id]) next[s.id] = { status: 'PRESENT', reason: '' }
      }
      return next
    })
  }, [studentsInClass])

  const setRow = (id, patch) => {
    setRowState((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: 'PRESENT', reason: '', ...patch },
    }))
  }

  const handleBulk = async () => {
    if (!studentsInClass.length) {
      notify.error('No students in this class filter.')
      return
    }
    for (const s of studentsInClass) {
      const r = rowState[s.id] || { status: 'PRESENT', reason: '' }
      if ((r.status === 'ABSENT' || r.status === 'LEAVE') && !r.reason.trim()) {
        notify.error(`Reason required for ${s.name} (${r.status}).`)
        return
      }
    }
    setBulkBusy(true)
    try {
      const entries = studentsInClass.map((s) => {
        const r = rowState[s.id] || { status: 'PRESENT', reason: '' }
        return {
          student: s.id,
          status: r.status,
          reason: r.status === 'PRESENT' ? '' : r.reason.trim(),
        }
      })
      const res = await bulkAttendance({ date: bulkDate, entries })
      notify.success(`Updated ${res.updated_ids?.length ?? 0} student(s).`)
      if (res.errors?.length) console.warn(res.errors)
      onApplied?.()
    } catch (e) {
      notify.error(formatApiError(e) || 'Bulk save failed.')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <Card className="border-slate-100 shadow-md shadow-slate-200/40 transition hover:shadow-lg dark:border-slate-800 dark:shadow-slate-950/30">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Bulk (class)</h3>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Defaults to Present for everyone. Adjust individuals below, then apply for the selected date.
      </p>
      <div className="mt-4 space-y-4">
        <InputField id="bulk-date" label="Date" type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} />
        <div className="w-full text-left">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Class</label>
          <select value={bulkClass} onChange={(e) => setBulkClass(e.target.value)} className={selectClass}>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All classes' : `Class ${c}`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {studentsInClass.length} student{studentsInClass.length === 1 ? '' : 's'} in selection.
        </p>

        <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          {studentsInClass.map((s) => {
            const r = rowState[s.id] || { status: 'PRESENT', reason: '' }
            const needReason = r.status === 'ABSENT' || r.status === 'LEAVE'
            return (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/40 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-500">Class {s.student_class}</p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => setRow(s.id, { status: e.target.value, reason: e.target.value === 'PRESENT' ? '' : r.reason })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </select>
                {needReason ? (
                  <input
                    type="text"
                    value={r.reason}
                    onChange={(e) => setRow(s.id, { reason: e.target.value })}
                    placeholder="Reason"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        <Button type="button" fullWidth loading={bulkBusy} onClick={handleBulk}>
          Apply to class
        </Button>
      </div>
    </Card>
  )
}
