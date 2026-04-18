import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Printer, Search } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { Loader } from '../Loader'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import { fetchAttendanceList, downloadAttendanceCsv, updateAttendance, deleteAttendance } from '../../services/attendanceApi'
import { fetchStudents } from '../../services/studentService'
import { MarkAttendanceForm } from './MarkAttendanceForm'
import { BulkAttendance } from './BulkAttendance'
import { AttendanceTable } from './AttendanceTable'
import { EditAttendanceModal } from './EditAttendanceModal'

/**
 * School-wide attendance hub (wrapped by `pages/AttendancePage` with layout).
 */
export function AttendancePage() {
  const location = useLocation()
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  const [editRecord, setEditRecord] = useState(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sList, aList] = await Promise.all([
        fetchStudents(),
        fetchAttendanceList({
          month: filterMonth,
          ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
          ...(searchDebounced ? { search: searchDebounced } : {}),
        }),
      ])
      setStudents(sList)
      setRecords(aList)
    } catch (e) {
      notify.error(
        e?.response?.status === 401
          ? 'Not authorized — log out and sign in again (JWT).'
          : formatApiError(e) || 'Could not load attendance.'
      )
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterStatus, searchDebounced])

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

  const handleExport = async () => {
    try {
      await downloadAttendanceCsv({
        month: filterMonth,
        ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
        ...(searchDebounced ? { search: searchDebounced } : {}),
      })
    } catch {
      notify.error('Could not download CSV.')
    }
  }

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

  const saveEdit = async (payload) => {
    if (!editRecord) return
    await updateAttendance(editRecord.id, payload)
    notify.success('Updated.')
    await load()
  }

  const handlePrint = () => window.print()

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [records])

  return (
    <div className="space-y-4 print:max-w-none">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Attendance</h2>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          One record per student per day · reason required for absent/leave
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <MarkAttendanceForm students={students} studentSelectId="att-student" onSuccess={load} />
        <BulkAttendance students={students} onApplied={load} />
      </div>

      <Card
        compact
        id="attendance-records"
        className="border-slate-100 shadow-sm dark:border-slate-800"
      >
        <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">All records</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search student name…"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
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
            <Button type="button" variant="secondary" onClick={handlePrint}>
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
          </div>
        </div>
        {loading ? (
          <Loader label="Loading…" className="py-8 print:hidden" size="sm" />
        ) : (
          <AttendanceTable
            rows={sortedRecords}
            loading={false}
            showStudent
            onEdit={(r) => setEditRecord(r)}
            onDelete={handleDelete}
          />
        )}
      </Card>

      <EditAttendanceModal
        open={!!editRecord}
        record={editRecord}
        onClose={() => setEditRecord(null)}
        onSave={saveEdit}
      />
    </div>
  )
}
