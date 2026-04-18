import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ClipboardCheck, Loader2, Users } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { InputField } from '../InputField'
import { bulkAttendance, fetchAttendanceList } from '../../services/attendanceApi'
import { fetchStudentClasses, fetchStudentsByClassName } from '../../services/studentService'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import { sortClassNames } from '../../utils/sortClassNames'
import { statusMeta } from './constants'

const STATUSES = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LEAVE', label: 'Leave' },
]

function buildRowsFromRoster(roster, existingByStudentId) {
  /** @type {Record<number, { status: string, reason: string }>} */
  const out = {}
  for (const s of roster) {
    const prev = existingByStudentId.get(s.id)
    out[s.id] = {
      status: prev?.status || 'PRESENT',
      reason: prev?.reason || '',
    }
  }
  return out
}

/**
 * One-screen class attendance marking for teachers.
 */
export function ClassAttendanceSheet() {
  const location = useLocation()
  const [classOptions, setClassOptions] = useState([])
  const [className, setClassName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [roster, setRoster] = useState([])
  /** @type {Record<number, { status: string, reason: string }>} */
  const [rows, setRows] = useState({})
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      try {
        const list = await fetchStudentClasses()
        if (!cancelled) setClassOptions(sortClassNames(list))
      } catch (e) {
        if (!cancelled) notify.error(formatApiError(e) || 'Could not load students.')
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Pre-fill from dashboard “Quick attendance” (navigate state). */
  useEffect(() => {
    const st = location.state
    if (!st || typeof st !== 'object') return
    if (st.className != null && String(st.className).trim()) {
      setClassName(String(st.className).trim())
    }
    if (st.date != null && String(st.date).trim()) {
      setDate(String(st.date).trim())
    }
  }, [location.state, location.key])

  const loadSheet = useCallback(async () => {
    const cn = String(className || '').trim()
    if (!cn) {
      setRoster([])
      setRows({})
      return
    }
    setLoadingSheet(true)
    try {
      const [list, attList] = await Promise.all([
        fetchStudentsByClassName(cn),
        fetchAttendanceList({ class: cn, start: date, end: date }),
      ])
      const existing = new Map()
      for (const a of attList || []) {
        const sid = a.student
        if (sid != null) existing.set(sid, a)
      }
      setRoster(list)
      setRows(buildRowsFromRoster(list, existing))
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load class roster.')
      setRoster([])
      setRows({})
    } finally {
      setLoadingSheet(false)
    }
  }, [className, date])

  useEffect(() => {
    loadSheet()
  }, [loadSheet])

  const setRow = (studentId, patch) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch },
    }))
  }

  const markAllPresent = () => {
    setRows((prev) => {
      const next = { ...prev }
      for (const s of roster) {
        next[s.id] = { status: 'PRESENT', reason: '' }
      }
      return next
    })
    notify.info('All set to Present.')
  }

  const summary = useMemo(() => {
    let present = 0
    let absent = 0
    let leave = 0
    for (const s of roster) {
      const r = rows[s.id]
      if (!r) continue
      if (r.status === 'PRESENT') present += 1
      else if (r.status === 'ABSENT') absent += 1
      else if (r.status === 'LEAVE') leave += 1
    }
    return { total: roster.length, present, absent, leave }
  }, [roster, rows])

  const handleSubmit = async () => {
    const cn = String(className || '').trim()
    if (!cn) {
      notify.error('Select a class.')
      return
    }
    if (!roster.length) {
      notify.error('No students in this class.')
      return
    }
    for (const s of roster) {
      const r = rows[s.id]
      if (!r) continue
      if ((r.status === 'ABSENT' || r.status === 'LEAVE') && !String(r.reason || '').trim()) {
        notify.error(`Reason required for ${s.name} (${r.status}).`)
        return
      }
    }
    const entries = roster.map((s) => {
      const r = rows[s.id] || { status: 'PRESENT', reason: '' }
      return {
        student: s.id,
        status: r.status,
        reason: r.status === 'PRESENT' ? '' : String(r.reason || '').trim(),
      }
    })
    setSaving(true)
    try {
      const res = await bulkAttendance({ date, entries })
      notify.success(`Saved attendance for ${res.updated_ids?.length ?? roster.length} student(s).`)
      if (res.errors?.length) console.warn(res.errors)
      window.dispatchEvent(
        new CustomEvent('attendance:saved', { detail: { className: cn, date } }),
      )
      await loadSheet()
    } catch (e) {
      notify.error(formatApiError(e) || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const selectClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:[color-scheme:dark] dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Class attendance sheet</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Load everyone in a class by roll number, set Present / Absent / Leave, then submit once for the selected date.
        </p>
      </div>

      <Card className="border-slate-100 p-6 shadow-md dark:border-slate-800">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="cas-class">
              Class
            </label>
            <select
              id="cas-class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className={selectClass}
              disabled={loadingMeta}
            >
              <option value="">Select class…</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
          <InputField
            id="cas-date"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex items-end gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={markAllPresent} disabled={!roster.length}>
              <Users className="mr-2 h-4 w-4" aria-hidden />
              Mark all present
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Default for each student is Present. Change status or add a reason for Absent / Leave. Submit updates every row
          for this date (existing records are overwritten).
        </p>
      </Card>

      {className && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['Total', summary.total],
            ['Present', summary.present],
            ['Absent', summary.absent],
            ['Leave', summary.leave],
          ].map(([k, v]) => (
            <Card key={k} className="border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{v}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden border-slate-100 p-0 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <ClipboardCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
            <span className="font-semibold">Students</span>
            {loadingSheet ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden /> : null}
          </div>
          <Button type="button" variant="primary" loading={saving} onClick={handleSubmit} disabled={!className || !roster.length}>
            Submit attendance
          </Button>
        </div>

        {!className ? (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Choose a class to load the roster.</p>
        ) : loadingSheet && !roster.length ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
        ) : !roster.length ? (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No students found for this class. Add students with this class name in Students.
          </p>
        ) : (
          <div className="max-h-[min(70vh,560px)] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {roster.map((s) => {
                  const r = rows[s.id] || { status: 'PRESENT', reason: '' }
                  const meta = statusMeta(r.status)
                  const showReason = r.status === 'ABSENT' || r.status === 'LEAVE'
                  return (
                    <tr key={s.id} className={`transition-colors ${meta.row}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {s.roll_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => {
                            const st = e.target.value
                            setRow(s.id, {
                              status: st,
                              reason: st === 'PRESENT' ? '' : r.reason,
                            })
                          }}
                          className="w-full min-w-[8rem] rounded-xl border border-slate-200 bg-white/90 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/80"
                        >
                          {STATUSES.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {showReason ? (
                          <input
                            type="text"
                            value={r.reason}
                            onChange={(e) => setRow(s.id, { reason: e.target.value })}
                            placeholder="Required"
                            className="w-full min-w-[10rem] rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900/80"
                          />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
