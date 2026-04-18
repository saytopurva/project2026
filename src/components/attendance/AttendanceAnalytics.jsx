import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { format, parseISO } from 'date-fns'
import { BarChart3, Camera, Loader2, TrendingDown } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../Card'
import { fetchAttendanceAnalytics } from '../../services/attendanceApi'
import { fetchStudents } from '../../services/studentService'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import { useTheme } from '../../hooks/useTheme'

const LOW_RATE = 0.8
/** Compact dashboard chart height (px) — keep within 220–280 */
const CHART_HEIGHT = 248

function buildWeeklySeries(daily) {
  const out = []
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7)
    if (!chunk.length) continue
    const first = chunk[0].date
    const last = chunk[chunk.length - 1].date
    const present = chunk.reduce((a, d) => a + d.present, 0)
    const absent = chunk.reduce((a, d) => a + d.absent, 0)
    const leave = chunk.reduce((a, d) => a + d.leave, 0)
    const marked = present + absent + leave
    let lowWeek = false
    if (marked > 0) {
      const rates = chunk
        .map((d) => {
          const m = d.present + d.absent + d.leave
          return m > 0 ? d.present / m : null
        })
        .filter((x) => x != null)
      if (rates.length) {
        const avgR = rates.reduce((a, b) => a + b, 0) / rates.length
        lowWeek = avgR < LOW_RATE
      }
    }
    out.push({
      label: `${format(parseISO(first), 'd MMM')} – ${format(parseISO(last), 'd MMM')}`,
      present,
      absent,
      leave,
      lowDay: lowWeek,
    })
  }
  return out
}

function enrichDaily(daily) {
  return daily.map((d) => {
    const marked = d.present + d.absent + d.leave
    const lowDay = marked > 0 && d.present / marked < LOW_RATE
    return {
      ...d,
      label: format(parseISO(d.date), 'EEE d'),
      shortDate: format(parseISO(d.date), 'MMM d'),
      lowDay,
    }
  })
}

/**
 * Class-wise attendance analytics: filters, Recharts line chart, summary, defaulters, export.
 */
export function AttendanceAnalytics({ showDefaulters = true }) {
  const { resolved } = useTheme()
  const isDark = resolved === 'dark'
  const tickFill = isDark ? '#94a3b8' : '#64748b'
  const gridStroke = isDark ? 'rgba(51, 65, 85, 0.28)' : 'rgba(226, 232, 240, 0.65)'
  const linePresent = isDark ? '#5eead4' : '#14b8a6'
  const lineAbsent = isDark ? '#fdba74' : '#ea580c'
  const lineLeave = isDark ? '#c4b5fd' : '#7c3aed'

  const chartExportRef = useRef(null)
  const classInitRef = useRef(false)
  const [classOptions, setClassOptions] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [viewMode, setViewMode] = useState('daily')
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingClasses(true)
      try {
        const list = await fetchStudents()
        if (cancelled) return
        const set = new Set((list || []).map((s) => s.student_class).filter(Boolean))
        const opts = [...set].sort((a, b) =>
          String(a).localeCompare(String(b), undefined, { numeric: true }),
        )
        setClassOptions(opts)
        if (opts.length && !classInitRef.current) {
          classInitRef.current = true
          setSelectedClass(opts[0])
        }
      } catch (e) {
        if (!cancelled) notify.error(formatApiError(e) || 'Could not load classes.')
      } finally {
        if (!cancelled) setLoadingClasses(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    const cn = String(selectedClass || '').trim()
    if (!cn) {
      setPayload(null)
      return
    }
    setLoading(true)
    try {
      const data = await fetchAttendanceAnalytics({
        class_name: cn,
        month: Number(month),
        year: Number(year),
      })
      setPayload(data)
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load analytics.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [selectedClass, month, year])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onSaved = () => {
      load()
    }
    window.addEventListener('attendance:saved', onSaved)
    return () => window.removeEventListener('attendance:saved', onSaved)
  }, [load])

  const chartRows = useMemo(() => {
    if (!payload?.daily_data?.length) return []
    if (viewMode === 'weekly') return buildWeeklySeries(payload.daily_data)
    return enrichDaily(payload.daily_data)
  }, [payload, viewMode])

  const yDomain = useMemo(() => {
    if (!chartRows.length) return [0, 10]
    let max = 0
    for (const r of chartRows) {
      max = Math.max(max, r.present + r.absent + r.leave)
    }
    const pad = Math.max(2, Math.ceil(max * 0.08))
    return [0, max + pad]
  }, [chartRows])

  const exportPng = async () => {
    const el = chartExportRef.current
    if (!el) return
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${selectedClass}-${year}-${month}.png`
      a.click()
      notify.info('Chart image downloaded.')
    } catch (e) {
      notify.error('Could not export image.')
      console.error(e)
    }
  }

  const summary = payload?.summary
  const defaulters = payload?.top_defaulters ?? []

  const selectCls =
    'rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:ring-sky-900/40'

  return (
    <Card
      accentClass="from-emerald-500 to-teal-600"
      className="h-full w-full max-w-none border-slate-100 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 hover:shadow-md hover:ring-emerald-500/20 dark:border-slate-800 dark:ring-slate-700/60 dark:hover:ring-emerald-500/25"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Present, absent & leave trends
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-md border border-slate-200/90 p-px dark:border-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === 'daily'
                  ? 'bg-emerald-600/90 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-emerald-600/90 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Weekly
            </button>
          </div>
          <button
            type="button"
            onClick={exportPng}
            disabled={!chartRows.length || loading}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Camera className="h-3 w-3" aria-hidden />
            PNG
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="aa-class">
            Class
          </label>
          <select
            id="aa-class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadingClasses}
            className={selectCls + ' w-full py-1.5 text-xs'}
          >
            <option value="">Select class…</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="aa-month">
            Month
          </label>
          <select
            id="aa-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={selectCls + ' w-full py-1.5 text-xs'}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0')
              return (
                <option key={m} value={m}>
                  {format(new Date(2000, i, 1), 'MMMM')}
                </option>
              )
            })}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="aa-year">
            Year
          </label>
          <input
            id="aa-year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={selectCls + ' w-full py-1.5 text-xs'}
          />
        </div>
      </div>

      {summary && selectedClass ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-100/90 bg-slate-50/90 px-3 py-2 text-[11px] dark:border-slate-700/80 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-500">Avg attendance</span>
          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {summary.avg_attendance ?? 0}%
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="tabular-nums text-slate-600 dark:text-slate-400">{summary.total_students ?? 0} students</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="tabular-nums text-slate-600 dark:text-slate-400">{summary.total_absents ?? 0} absent</span>
        </div>
      ) : null}

      <div
        ref={chartExportRef}
        className="mt-3 rounded-xl border border-slate-100/90 bg-gradient-to-b from-slate-50/60 to-white/40 p-3 dark:border-slate-700/80 dark:from-slate-900/40 dark:to-slate-900/20"
      >
        <div className="flex items-start justify-between gap-2 px-0.5 pb-2">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Attendance trend</p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {payload ? `${payload.month} ${payload.year} · Class ${payload.class}` : 'Pick class & period'}
            </p>
          </div>
          {loading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-500/90" aria-hidden /> : null}
        </div>
        <div className="h-[var(--chart-h)] w-full min-w-0" style={{ '--chart-h': `${CHART_HEIGHT}px` }}>
          {!selectedClass ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              Choose a class to load analytics.
            </p>
          ) : loading && !payload ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</p>
          ) : chartRows.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No attendance records for this month.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={gridStroke} horizontal vertical={false} />
                <XAxis
                  dataKey={viewMode === 'weekly' ? 'label' : 'shortDate'}
                  tick={{ fontSize: 8, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tickMargin={3}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 8, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                  tickMargin={2}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(45, 212, 191, 0.35)', strokeWidth: 1 }}
                  animationDuration={200}
                  content={({ active, label, payload: rows }) => {
                    if (!active || !rows?.length) return null
                    const row = rows[0]?.payload
                    if (!row) return null
                    const title =
                      viewMode === 'daily' && row.date
                        ? format(parseISO(row.date), 'MMM d, yyyy')
                        : row.label || String(label)
                    return (
                      <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1 text-[10px] shadow-md backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/95">
                        <p className="font-medium leading-tight text-slate-800 dark:text-slate-100">{title}</p>
                        <p className="mt-0.5 tabular-nums leading-tight text-slate-600 dark:text-slate-400">
                          {row.present} present · {row.absent} absent · {row.leave} leave
                        </p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke={linePresent}
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload: p } = props
                    const low = p?.lowDay
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={low ? 4 : 2.5}
                        fill={low ? '#fbbf24' : linePresent}
                        stroke={isDark ? '#0f172a' : '#fff'}
                        strokeWidth={1}
                      />
                    )
                  }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: linePresent }}
                  isAnimationActive
                  animationDuration={380}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  name="Absent"
                  stroke={lineAbsent}
                  strokeWidth={1.5}
                  strokeOpacity={0.88}
                  dot={false}
                  isAnimationActive
                  animationDuration={380}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="leave"
                  name="Leave"
                  stroke={lineLeave}
                  strokeWidth={1.5}
                  strokeOpacity={0.88}
                  dot={false}
                  isAnimationActive
                  animationDuration={380}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {chartRows.length > 0 ? (
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[9px] text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-3.5 rounded-full bg-teal-400/90 dark:bg-teal-500/75" />
              Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-3.5 rounded-full bg-orange-300/95 dark:bg-orange-400/70" />
              Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-3.5 rounded-full bg-violet-300/90 dark:bg-violet-400/65" />
              Leave
            </span>
            <span className="text-slate-400 dark:text-slate-600">Low rate: amber marker</span>
          </div>
        ) : null}
      </div>

      {showDefaulters && selectedClass && defaulters.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-100/90 bg-slate-50/40 dark:border-slate-700/80 dark:bg-slate-800/25">
          <div className="flex items-center gap-2 border-b border-slate-100/90 px-3 py-2 dark:border-slate-700/80">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" aria-hidden />
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Top defaulters
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[11px]">
              <thead className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Student</th>
                  <th className="px-3 py-1.5">%</th>
                  <th className="px-3 py-1.5">Abs</th>
                  <th className="px-3 py-1.5">Lv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90 dark:divide-slate-700/80">
                {defaulters.map((d) => (
                  <tr key={d.student_id} className="hover:bg-white/60 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{d.name}</td>
                    <td className="px-3 py-1.5 tabular-nums text-slate-600 dark:text-slate-400">
                      {d.attendance_percent}%
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-rose-600/90 dark:text-rose-400/90">{d.absent_days}</td>
                    <td className="px-3 py-1.5 tabular-nums text-amber-600/90 dark:text-amber-400/90">{d.leave_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
