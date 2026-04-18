import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, GitCompare, Loader2, TrendingUp } from 'lucide-react'
import { Card } from '../Card'
import { fetchExamTypes } from '../../services/structuredMarksService'
import { fetchSubjectPerformance } from '../../services/subjectPerformanceService'
import { fetchStudents } from '../../services/studentService'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import { useTheme } from '../../hooks/useTheme'

/** Soft, dashboard-friendly bar fills */
function barColor(pct) {
  if (pct >= 70) return '#7dd3c0'
  if (pct >= 50) return '#fde68a'
  return '#f9a8a8'
}

const CHART_HEIGHT = 248
const CHART_HEIGHT_SECONDARY = 232

function shortSubjectLabel(name, max = 11) {
  if (!name || name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

function mergeCompare(primary, compareSubjects) {
  const names = new Set([
    ...primary.map((r) => r.subject),
    ...compareSubjects.map((r) => r.subject),
  ])
  return [...names].sort((a, b) => a.localeCompare(b)).map((subject) => {
    const a = primary.find((r) => r.subject === subject)
    const b = compareSubjects.find((r) => r.subject === subject)
    return {
      subject,
      primaryPct: a?.percentage ?? null,
      comparePct: b?.percentage ?? null,
      primaryAvg: a?.average_marks ?? null,
      compareAvg: b?.average_marks ?? null,
    }
  })
}

function mergeTrend(trend) {
  if (!trend?.UNIT_TEST || !trend?.SEMESTER) return []
  const ut = trend.UNIT_TEST
  const sem = trend.SEMESTER
  const names = new Set([...ut.map((r) => r.subject), ...sem.map((r) => r.subject)])
  return [...names].sort((a, b) => a.localeCompare(b)).map((subject) => ({
    subject,
    unitTest: ut.find((r) => r.subject === subject)?.percentage ?? null,
    semester: sem.find((r) => r.subject === subject)?.percentage ?? null,
  }))
}

/**
 * Subject-wise performance from structured marks: filters, bar chart, table, summaries.
 */
export function SubjectPerformance() {
  const { resolved } = useTheme()
  const isDark = resolved === 'dark'
  const tickFill = isDark ? '#94a3b8' : '#64748b'
  const gridStroke = isDark ? 'rgba(51, 65, 85, 0.28)' : 'rgba(226, 232, 240, 0.65)'
  const comparePrimary = isDark ? '#6ee7b7' : '#4ade80'
  const compareSecondary = isDark ? '#7dd3fc' : '#38bdf8'
  const trendUt = isDark ? '#c4b5fd' : '#a78bfa'
  const trendSem = isDark ? '#fdba74' : '#fb923c'

  const classInitRef = useRef(false)
  const [classOptions, setClassOptions] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [compareClass, setCompareClass] = useState('')
  const [examTypes, setExamTypes] = useState([])
  const [examType, setExamType] = useState('UNIT_TEST')
  const [includeTrend, setIncludeTrend] = useState(false)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMeta, setLoadingMeta] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      try {
        const [students, types] = await Promise.all([fetchStudents(), fetchExamTypes()])
        if (cancelled) return
        const set = new Set((students || []).map((s) => s.student_class).filter(Boolean))
        const opts = [...set].sort((a, b) =>
          String(a).localeCompare(String(b), undefined, { numeric: true }),
        )
        setClassOptions(opts)
        if (opts.length && !classInitRef.current) {
          classInitRef.current = true
          setSelectedClass(opts[0])
        }
        setExamTypes(Array.isArray(types) ? types : [])
      } catch (e) {
        if (!cancelled) notify.error(formatApiError(e) || 'Could not load filters.')
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!examTypes.length) return
    if (!examTypes.some((t) => t.slug === examType)) {
      setExamType(examTypes[0].slug)
    }
  }, [examTypes, examType])

  const load = useCallback(async () => {
    const cn = String(selectedClass || '').trim()
    if (!cn || !examType) {
      setPayload(null)
      return
    }
    setLoading(true)
    try {
      const data = await fetchSubjectPerformance({
        class_name: cn,
        exam_type: examType,
        compare_class_name: String(compareClass || '').trim() || undefined,
        include_trend: includeTrend ? true : undefined,
      })
      setPayload(data)
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load subject performance.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [selectedClass, examType, compareClass, includeTrend])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onMarks = () => load()
    window.addEventListener('marks:updated', onMarks)
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('marks:updated', onMarks)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  const chartPrimary = useMemo(() => {
    if (!payload?.subjects?.length) return []
    return payload.subjects.map((r) => ({
      ...r,
      name: r.subject,
      avg: r.average_marks,
      pct: r.percentage,
      fill: barColor(r.percentage),
      weak: r.percentage < 50,
    }))
  }, [payload])

  const compareChart = useMemo(() => {
    if (!payload?.compare?.subjects?.length) return []
    return mergeCompare(payload.subjects, payload.compare.subjects)
  }, [payload])

  const trendChart = useMemo(() => mergeTrend(payload?.trend), [payload?.trend])

  const summary = payload?.summary
  const selectCls =
    'rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 shadow-inner focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:ring-amber-900/40'

  return (
    <Card
      accentClass="from-amber-400 to-orange-500"
      className="h-full w-full max-w-none border-slate-100 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 hover:shadow-md hover:ring-amber-500/20 dark:border-slate-800 dark:ring-slate-700/60 dark:hover:ring-amber-500/25"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Subject performance</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Structured marks by subject</p>
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-amber-500/90" aria-hidden /> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[120px] flex-1">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="sp-class">
            Class
          </label>
          <select
            id="sp-class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadingMeta}
            className={selectCls + ' w-full'}
          >
            <option value="">Select class…</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="sp-exam">
            Exam
          </label>
          <select
            id="sp-exam"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className={selectCls + ' w-full'}
          >
            {examTypes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name || t.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px] flex-1">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="sp-compare">
            Compare
          </label>
          <select
            id="sp-compare"
            value={compareClass}
            onChange={(e) => setCompareClass(e.target.value)}
            className={selectCls + ' w-full'}
          >
            <option value="">None</option>
            {classOptions
              .filter((c) => c !== selectedClass)
              .map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200/90 px-2 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={includeTrend}
            onChange={(e) => setIncludeTrend(e.target.checked)}
            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <TrendingUp className="h-3 w-3" aria-hidden />
          UT vs Sem
        </label>
      </div>

      {summary && selectedClass ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-100/90 bg-slate-50/90 px-3 py-2 text-[11px] leading-snug text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-400">
          <span>
            <span className="text-slate-400 dark:text-slate-500">Best subject</span>{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{summary.best_subject ?? '—'}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>
            <span className="text-slate-400 dark:text-slate-500">Weakest</span>{' '}
            <span className="font-semibold text-amber-800 dark:text-amber-300">{summary.weakest_subject ?? '—'}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="tabular-nums">
            Class avg <strong className="text-slate-800 dark:text-slate-100">{summary.overall_class_average ?? 0}%</strong>
          </span>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-100/90 bg-gradient-to-b from-slate-50/50 to-white/30 p-3 dark:border-slate-700/80 dark:from-slate-900/35 dark:to-slate-900/15">
        <div className="mb-2 px-0.5">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Scores by subject</p>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            {payload && selectedClass
              ? `${examTypes.find((t) => t.slug === examType)?.name || examType} · Class ${payload.class_name}`
              : 'Select class & exam'}
          </p>
        </div>
        <div className="h-[var(--sp-h)] w-full min-w-0" style={{ '--sp-h': `${CHART_HEIGHT}px` }}>
        {!selectedClass ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">Select a class.</p>
        ) : loading && !payload ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</p>
        ) : chartPrimary.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No marks for this class and exam yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartPrimary}
              margin={{ top: 4, right: 2, left: -10, bottom: 2 }}
              barCategoryGap="10%"
              barGap={1}
            >
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={gridStroke} />
              <XAxis
                dataKey="subject"
                tick={{ fontSize: 8, fill: tickFill }}
                tickFormatter={shortSubjectLabel}
                axisLine={false}
                tickLine={false}
                angle={-14}
                textAnchor="end"
                height={40}
                interval={chartPrimary.length > 10 ? 'preserveStartEnd' : 0}
                minTickGap={4}
              />
              <YAxis
                tick={{ fontSize: 8, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: 'rgba(251, 191, 36, 0.07)' }}
                animationDuration={180}
                content={({ active, payload: rows }) => {
                  if (!active || !rows?.length) return null
                  const p = rows[0].payload
                  return (
                    <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1 text-[10px] shadow-md dark:border-slate-600 dark:bg-slate-900/95">
                      <p className="font-medium leading-tight text-slate-800 dark:text-slate-100">{p.subject}</p>
                      <p className="mt-0.5 tabular-nums leading-tight text-slate-600 dark:text-slate-400">
                        {p.percentage}% · avg {p.average_marks}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="average_marks"
                name="Avg"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={380}
                animationEasing="ease-out"
                activeBar={{ fillOpacity: 0.92, stroke: 'rgba(251, 191, 36, 0.5)', strokeWidth: 1 }}
              >
                {chartPrimary.map((entry) => (
                  <Cell
                    key={entry.subject}
                    fill={entry.fill}
                    stroke={entry.weak ? 'rgba(185, 28, 28, 0.35)' : 'transparent'}
                    strokeWidth={entry.weak ? 1 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>

      {payload?.compare && compareChart.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-100/90 bg-slate-50/40 p-3 dark:border-slate-700/80 dark:bg-slate-900/25">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <GitCompare className="h-3.5 w-3.5 text-sky-500/90" aria-hidden />
            Class {payload.class_name} vs {payload.compare.class_name}
          </div>
          <div
            className="h-[var(--sp-h2)] w-full min-w-0"
            style={{ '--sp-h2': `${CHART_HEIGHT_SECONDARY}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compareChart}
                margin={{ top: 4, right: 2, left: -6, bottom: 2 }}
                barGap={2}
                barCategoryGap="12%"
              >
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 8, fill: tickFill }}
                  tickFormatter={shortSubjectLabel}
                  axisLine={false}
                  tickLine={false}
                  angle={-14}
                  textAnchor="end"
                  height={38}
                  interval={compareChart.length > 10 ? 'preserveStartEnd' : 0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(14, 165, 233, 0.06)' }}
                  animationDuration={180}
                  content={({ active, payload: rows }) => {
                    if (!active || !rows?.length) return null
                    const sub = rows[0]?.payload?.subject
                    const a = rows.find((x) => x.dataKey === 'primaryPct')?.value
                    const b = rows.find((x) => x.dataKey === 'comparePct')?.value
                    return (
                      <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1 text-[10px] dark:border-slate-600 dark:bg-slate-900/95">
                        <p className="font-medium leading-tight text-slate-800 dark:text-slate-100">{sub}</p>
                        <p className="mt-0.5 tabular-nums leading-tight text-slate-600 dark:text-slate-400">
                          {payload.class_name}: {a ?? '—'}% · {payload.compare.class_name}: {b ?? '—'}%
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="primaryPct"
                  name={`Cls ${payload.class_name}`}
                  fill={comparePrimary}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive
                  animationDuration={360}
                  activeBar={{ fillOpacity: 0.9 }}
                />
                <Bar
                  dataKey="comparePct"
                  name={`Cls ${payload.compare.class_name}`}
                  fill={compareSecondary}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive
                  animationDuration={360}
                  activeBar={{ fillOpacity: 0.9 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[9px] text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: comparePrimary }} />
              Class {payload.class_name}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: compareSecondary }} />
              Class {payload.compare.class_name}
            </span>
          </div>
        </div>
      ) : null}

      {includeTrend && trendChart.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-100/90 bg-slate-50/40 p-3 dark:border-slate-700/80 dark:bg-slate-900/25">
          <h4 className="mb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">Unit test vs semester</h4>
          <div
            className="h-[var(--sp-h3)] w-full min-w-0"
            style={{ '--sp-h3': `${CHART_HEIGHT_SECONDARY}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendChart}
                margin={{ top: 4, right: 2, left: -6, bottom: 2 }}
                barGap={2}
                barCategoryGap="12%"
              >
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="subject"
                  tick={{ fontSize: 8, fill: tickFill }}
                  tickFormatter={shortSubjectLabel}
                  axisLine={false}
                  tickLine={false}
                  angle={-14}
                  textAnchor="end"
                  height={38}
                  interval={trendChart.length > 10 ? 'preserveStartEnd' : 0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}`}
                  tick={{ fontSize: 8, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(167, 139, 250, 0.07)' }}
                  animationDuration={180}
                  content={({ active, payload: rows }) => {
                    if (!active || !rows?.length) return null
                    const sub = rows[0]?.payload?.subject
                    const ut = rows.find((x) => x.dataKey === 'unitTest')?.value
                    const sem = rows.find((x) => x.dataKey === 'semester')?.value
                    return (
                      <div className="rounded-lg border border-slate-200/80 bg-white/95 px-2 py-1 text-[10px] dark:border-slate-600 dark:bg-slate-900/95">
                        <p className="font-medium leading-tight text-slate-800 dark:text-slate-100">{sub}</p>
                        <p className="mt-0.5 tabular-nums leading-tight text-slate-600 dark:text-slate-400">
                          UT {ut ?? '—'}% · Sem {sem ?? '—'}%
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="unitTest"
                  name="Unit Test"
                  fill={trendUt}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive
                  animationDuration={360}
                  activeBar={{ fillOpacity: 0.9 }}
                />
                <Bar
                  dataKey="semester"
                  name="Semester"
                  fill={trendSem}
                  radius={[5, 5, 0, 0]}
                  isAnimationActive
                  animationDuration={360}
                  activeBar={{ fillOpacity: 0.9 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[9px] text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: trendUt }} />
              Unit test
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: trendSem }} />
              Semester
            </span>
          </div>
        </div>
      ) : null}

      {payload?.subjects?.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100/90 dark:border-slate-700/80">
          <table className="w-full min-w-[520px] text-left text-[11px]">
            <thead className="border-b border-slate-100/90 bg-slate-50/90 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-500">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Avg</th>
                <th className="px-3 py-2">Hi</th>
                <th className="px-3 py-2">Lo</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">N</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 dark:divide-slate-700/80">
              {payload.subjects.map((r) => {
                const weak = r.percentage < 50
                return (
                  <tr
                    key={r.subject}
                    className={
                      weak
                        ? 'bg-red-50/70 dark:bg-red-950/20'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/35'
                    }
                  >
                    <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">
                      {r.subject}
                      {weak ? (
                        <span className="ml-1.5 rounded bg-red-100/90 px-1 py-px text-[9px] font-bold uppercase text-red-700 dark:bg-red-950/80 dark:text-red-300">
                          Weak
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-slate-600 dark:text-slate-400">{r.average_marks}</td>
                    <td className="px-3 py-1.5 tabular-nums text-slate-600 dark:text-slate-400">{r.highest_marks}</td>
                    <td className="px-3 py-1.5 tabular-nums text-slate-600 dark:text-slate-400">{r.lowest_marks}</td>
                    <td className="px-3 py-1.5 tabular-nums font-medium text-slate-800 dark:text-slate-200">
                      {r.percentage}%
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-slate-500 dark:text-slate-500">{r.total_students}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  )
}
