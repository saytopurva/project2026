import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Mail, Printer } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { InputField } from '../components/InputField'
import { Loader } from '../components/Loader'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import {
  downloadAttendanceReportCsv,
  fetchMonthlyAttendanceReport,
  sendReportToParent,
} from '../services/attendanceReportService'
import { fetchStudents } from '../services/studentService'

export function AttendanceReportPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [onlyAbsentReasons, setOnlyAbsentReasons] = useState(false)

  const loadStudents = useCallback(async () => {
    try {
      const list = await fetchStudents()
      setStudents(list)
    } catch (e) {
      notify.error(e?.message || 'Could not load students.')
    }
  }, [])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const loadReport = useCallback(async () => {
    if (!studentId) {
      notify.error('Select a student.')
      return
    }
    setLoading(true)
    try {
      const data = await fetchMonthlyAttendanceReport(studentId, Number(month), Number(year))
      setReport(data)
    } catch (e) {
      notify.error(e?.response?.data?.detail || e?.message || 'Could not load report.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [studentId, month, year])

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const handleSend = async () => {
    if (!studentId) return notify.error('Select a student.')
    setSending(true)
    try {
      await sendReportToParent(studentId, Number(month), Number(year))
      notify.success('Report sent to parent email.')
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        'Send failed.'
      notify.error(msg)
    } finally {
      setSending(false)
    }
  }

  const handlePrint = () => window.print()

  const dailyRows = report?.daily || []
  const filteredDaily = onlyAbsentReasons
    ? dailyRows.filter((r) => r.status === 'ABSENT' || r.status === 'LEAVE')
    : dailyRows

  return (
    <DashboardLayout user={user} title="Attendance report" onLogout={handleLogout}>
      <div className="mx-auto max-w-5xl space-y-8 print:max-w-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Monthly attendance report
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Summary, daily breakdown, absent/leave reasons, CSV export, and parent email.
          </p>
        </div>

        <Card className="border-slate-100 p-6 print:hidden dark:border-slate-800">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Student
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50"
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
              id="rep-month"
              label="Month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <InputField
              id="rep-year"
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="primary" onClick={loadReport} disabled={loading}>
              {loading ? 'Loading…' : 'Load report'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                downloadAttendanceReportCsv(studentId, Number(month), Number(year))
              }
              disabled={!studentId}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint} disabled={!report}>
              <Printer className="mr-2 h-4 w-4" />
              PDF / Print
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSend}
              disabled={!studentId || sending}
              loading={sending}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send to parent
            </Button>
          </div>
        </Card>

        {loading ? <Loader label="Loading report…" className="py-12 print:hidden" /> : null}

        {report ? (
          <div className="space-y-6 print:shadow-none">
            <Card className="border-slate-100 p-6 dark:border-slate-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {report.student?.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Class {report.student?.class || '—'} · Roll {report.student?.roll_no ?? '—'} ·{' '}
                    {String(report.period?.month).padStart(2, '0')}/{report.period?.year}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Total days', report.summary?.total_days],
                    ['Present', report.summary?.present],
                    ['Absent', report.summary?.absent],
                    ['Leave', report.summary?.leave],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {k}
                      </p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                        {v ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-sky-700 dark:text-sky-300">
                Attendance: {report.summary?.percentage ?? '—'}%
              </p>
            </Card>

            <div className="flex items-center justify-between print:hidden">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyAbsentReasons}
                  onChange={(e) => setOnlyAbsentReasons(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600"
                />
                Show only absent and leave days
              </label>
            </div>

            <Card className="overflow-hidden border-slate-100 p-0 dark:border-slate-800">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Daily records</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDaily.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                          No rows for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDaily.map((r) => (
                        <tr key={`${r.date}-${r.status}`} className="bg-white dark:bg-slate-900/30">
                          <td className="px-6 py-3 tabular-nums text-slate-800 dark:text-slate-200">
                            {r.date}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={
                                r.status === 'PRESENT'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : r.status === 'ABSENT'
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                            {r.reason || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
