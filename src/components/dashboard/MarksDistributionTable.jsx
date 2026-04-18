import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import { Card } from '../Card'
import { fetchExamTypes, fetchMarksDistribution } from '../../services/structuredMarksService'
import { fetchStudents } from '../../services/studentService'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'

const SORT_AVG = 'avg'
const SORT_PASS = 'pass'

function avgMarksTone(pct) {
  if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function passTone(pct) {
  if (pct > 75) return 'text-emerald-600 dark:text-emerald-400'
  if (pct < 40) return 'text-rose-500 dark:text-rose-400'
  return 'text-slate-600 dark:text-slate-400'
}

/**
 * Compact class-wise marks distribution: filters, sort, mini avg bars, highlights.
 */
export function MarksDistributionTable() {
  const classInitRef = useRef(false)
  const [classOptions, setClassOptions] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [examTypes, setExamTypes] = useState([])
  const [examType, setExamType] = useState('UNIT_TEST')
  const [sortBy, setSortBy] = useState(SORT_AVG)
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
      const data = await fetchMarksDistribution({
        class_name: cn,
        exam_type: examType,
      })
      setPayload(data)
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load marks distribution.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [selectedClass, examType])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onMarks = () => load()
    window.addEventListener('marks:updated', onMarks)
    return () => window.removeEventListener('marks:updated', onMarks)
  }, [load])

  const rows = useMemo(() => {
    const list = payload?.subjects ? [...payload.subjects] : []
    if (sortBy === SORT_PASS) {
      list.sort((a, b) => b.pass_percentage - a.pass_percentage)
    } else {
      list.sort((a, b) => b.avg_marks - a.avg_marks)
    }
    return list
  }, [payload, sortBy])

  const summary = payload?.summary
  const best = summary?.best_subject
  const weak = summary?.weakest_subject
  const selectCls =
    'rounded-lg border border-slate-200/90 bg-slate-50/50 px-2 py-1 text-xs text-slate-900 shadow-inner focus:border-teal-400/80 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:ring-teal-900/40'

  return (
    <Card
      accentClass="from-emerald-500 to-teal-500"
      className="w-full max-w-none border-slate-100 shadow-sm ring-1 ring-slate-200/70 transition-shadow duration-200 hover:shadow-md hover:ring-emerald-500/15 dark:border-slate-800 dark:ring-slate-700/60 dark:hover:ring-emerald-500/20"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Marks distribution</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Class-wise subjects · pass at {payload?.pass_threshold_percent ?? 40}% of max
          </p>
        </div>
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-500/90" aria-hidden /> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[120px] flex-1">
          <label
            className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            htmlFor="md-class"
          >
            Class
          </label>
          <select
            id="md-class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loadingMeta}
            className={`${selectCls} w-full`}
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
          <label
            className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            htmlFor="md-exam"
          >
            Exam type
          </label>
          <select
            id="md-exam"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className={`${selectCls} w-full`}
          >
            {examTypes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name || t.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[130px]">
          <label
            className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            htmlFor="md-sort"
          >
            Sort by
          </label>
          <select
            id="md-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`${selectCls} w-full`}
          >
            <option value={SORT_AVG}>Avg marks (high → low)</option>
            <option value={SORT_PASS}>Pass % (high → low)</option>
          </select>
        </div>
      </div>

      {summary && selectedClass ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-100/90 bg-slate-50/90 px-2.5 py-1.5 text-[10px] dark:border-slate-700/80 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-500">Students</span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {summary.total_students ?? 0}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-500">Class avg</span>
          <span className="font-semibold tabular-nums text-teal-700 dark:text-teal-300">
            {summary.overall_class_average ?? 0}%
          </span>
          {payload?.exam_type_label ? (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-500 dark:text-slate-500">{payload.exam_type_label}</span>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 max-h-[min(52vh,420px)] overflow-auto rounded-lg border border-slate-100/90 dark:border-slate-700/80">
        <table className="w-full min-w-[480px] border-collapse text-left text-[10px]">
          <thead className="sticky top-0 z-[1] border-b border-slate-200/90 bg-slate-50/95 text-[9px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-2 py-1.5">Subject</th>
              <th className="px-2 py-1.5">Avg</th>
              <th className="whitespace-nowrap px-2 py-1.5">Hi</th>
              <th className="whitespace-nowrap px-2 py-1.5">Lo</th>
              <th className="whitespace-nowrap px-2 py-1.5">Pass %</th>
              <th className="whitespace-nowrap px-2 py-1.5">Fail %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 dark:divide-slate-800">
            {!selectedClass ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-500 dark:text-slate-400">
                  Select a class.
                </td>
              </tr>
            ) : loading && !payload ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-slate-500 dark:text-slate-400">
                  No marks for this class and exam yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isBest = best && r.subject === best
                const isWeak = weak && r.subject === weak && !isBest
                const pct = r.avg_percentage ?? 0
                return (
                  <tr
                    key={r.subject}
                    className={
                      isBest
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/25'
                        : isWeak
                          ? 'bg-amber-50/60 dark:bg-amber-950/15'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="max-w-[140px] px-2 py-1 align-middle">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-medium leading-tight text-slate-800 dark:text-slate-100">{r.subject}</span>
                        {isBest ? (
                          <span className="rounded bg-emerald-200/90 px-1 py-px text-[8px] font-bold uppercase text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                            Best
                          </span>
                        ) : null}
                        {isWeak ? (
                          <span className="rounded bg-amber-200/80 px-1 py-px text-[8px] font-bold uppercase text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                            Weak
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-1 align-middle">
                      <div className="flex min-w-[88px] flex-col gap-0.5">
                        <span className={`tabular-nums font-medium ${avgMarksTone(pct)}`}>
                          {r.avg_marks}
                          <span className="font-normal text-slate-400 dark:text-slate-500"> ({pct}%)</span>
                        </span>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-400/90 to-emerald-400/90 transition-[width] duration-300 dark:from-teal-500/80 dark:to-emerald-500/70"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="tabular-nums px-2 py-1 text-slate-600 dark:text-slate-400">{r.highest}</td>
                    <td className="tabular-nums px-2 py-1 text-slate-600 dark:text-slate-400">{r.lowest}</td>
                    <td
                      className={`tabular-nums px-2 py-1 font-medium ${passTone(r.pass_percentage)}`}
                    >
                      {r.pass_percentage}%
                    </td>
                    <td className="tabular-nums px-2 py-1 text-slate-600 dark:text-slate-400">{r.fail_percentage}%</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
