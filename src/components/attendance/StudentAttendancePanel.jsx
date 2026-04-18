import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, Search } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { AttendanceTable } from './AttendanceTable'
import { MarkAttendanceForm } from './MarkAttendanceForm'
import { AttendanceSummary } from './AttendanceSummary'
import { AttendanceCalendar } from './AttendanceCalendar'
import { EditAttendanceModal } from './EditAttendanceModal'
import {
  deleteAttendance,
  downloadAttendanceCsv,
  fetchAttendanceByStudent,
  fetchAttendanceSummary,
  updateAttendance,
} from '../../services/attendanceApi'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'

/**
 * Full attendance UI for a single student (profile tab).
 * @param {object} props
 * @param {string|number} props.studentId
 */
export function StudentAttendancePanel({ studentId }) {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])
  const [summary, setSummary] = useState(null)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [editRecord, setEditRecord] = useState(null)

  const monthParts = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return { year: y, month: m }
  }, [month])

  const load = useCallback(async () => {
    const sid = String(studentId || '').trim()
    if (!sid) {
      setLoading(false)
      setResults([])
      setSummary(null)
      return
    }
    setLoading(true)
    try {
      const params = { month }
      if (statusFilter !== 'all') params.status = statusFilter
      const [data, sum] = await Promise.all([
        fetchAttendanceByStudent(sid, params),
        fetchAttendanceSummary(sid, monthParts.month, monthParts.year),
      ])
      setResults(data.results || [])
      setSummary(sum)
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load attendance.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [studentId, month, statusFilter, monthParts.month, monthParts.year])

  useEffect(() => {
    load()
  }, [load])

  const pct = summary?.percentage ?? 0
  const lowAttendance = pct < 75 && (results.length > 0 || (summary?.total_days ?? 0) > 0)

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return results
    return results.filter((r) => (r.date || '').includes(q) || (r.reason || '').toLowerCase().includes(q))
  }, [results, search])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return
    try {
      await deleteAttendance(id)
      notify.success('Deleted.')
      await load()
    } catch (e) {
      notify.error(formatApiError(e) || 'Delete failed.')
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

  const saveEdit = async (payload) => {
    if (!editRecord) return
    await updateAttendance(editRecord.id, payload)
    notify.success('Updated.')
    await load()
  }

  return (
    <div className="space-y-6">
      {lowAttendance ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold">Attendance is below 75% for this month</p>
            <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
              Consider following up with the student or guardians.
            </p>
          </div>
        </div>
      ) : null}

      {summary ? <AttendanceSummary summary={summary} title="Monthly summary" /> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MarkAttendanceForm
            key={studentId}
            students={[]}
            fixedStudentId={studentId}
            onSuccess={load}
          />

          <Card className="border-slate-100 shadow-md dark:border-slate-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Records</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[140px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search date or reason…"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </div>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
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
            <AttendanceTable
              rows={filteredRows}
              loading={loading}
              onEdit={(r) => setEditRecord(r)}
              onDelete={handleDelete}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <AttendanceCalendar month={month} records={results} />
          <Card className="border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Use Edit to change a day&apos;s status or reason. Present rows have no reason stored.
            </p>
          </Card>
        </div>
      </div>

      <EditAttendanceModal
        open={!!editRecord}
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSave={saveEdit}
      />
    </div>
  )
}
