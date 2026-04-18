import { useCallback, useEffect, useState } from 'react'
import { Award, Plus } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { ExamTabs } from '../marks/ExamTabs'
import { MarksChart } from '../marks/MarksChart'
import { MarksTable } from '../marks/MarksTable'
import { EditMarksModal } from '../marks/EditMarksModal'
import { ResultDetail } from '../results/ResultDetail'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import {
  createStructuredMark,
  deleteStructuredMark,
  fetchExamTypes,
  fetchMarksByStudent,
  fetchSubjects,
  updateStructuredMark,
} from '../../services/structuredMarksService'
import { fetchStudentResult } from '../../services/resultsService'

function SummaryCard({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  )
}

export function StudentResultsSection({ studentId }) {
  const sid = Number(studentId)
  const [examTypes, setExamTypes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [examTab, setExamTab] = useState(null)
  const [results, setResults] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [officialResult, setOfficialResult] = useState(null)
  const [officialLoading, setOfficialLoading] = useState(false)

  const loadMeta = useCallback(async () => {
    const [et, sub] = await Promise.all([fetchExamTypes(), fetchSubjects()])
    setExamTypes(et)
    setSubjects(sub)
  }, [])

  const loadMarks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMarksByStudent(sid, { examType: examTab || undefined })
      setResults(data.results || [])
      setSummary(data.summary || null)
    } catch (e) {
      notify.error(e?.message || 'Could not load marks.')
    } finally {
      setLoading(false)
    }
  }, [sid, examTab])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (!sid || !examTab) {
      setOfficialResult(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setOfficialLoading(true)
      try {
        const data = await fetchStudentResult(sid, examTab)
        if (!cancelled) setOfficialResult(data)
      } catch (e) {
        if (!cancelled) {
          setOfficialResult(null)
          notify.error(formatApiError(e) || 'Could not load ranked result.')
        }
      } finally {
        if (!cancelled) setOfficialLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sid, examTab])

  useEffect(() => {
    if (!sid) return
    loadMarks()
  }, [sid, loadMarks])

  const onSubmitModal = async (payload) => {
    const { id, ...rest } = payload
    if (id) {
      await updateStructuredMark(id, rest)
      notify.success('Marks updated.')
    } else {
      await createStructuredMark(rest)
      notify.success('Marks saved.')
    }
    await loadMarks()
    await loadMeta()
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this marks entry?')) return
    setBusyId(id)
    try {
      await deleteStructuredMark(id)
      notify.success('Deleted.')
      await loadMarks()
    } catch (e) {
      notify.error(e?.message || 'Delete failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" aria-hidden />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Results</h3>
        </div>
        <Button type="button" variant="primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Add marks
        </Button>
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total score"
            value={`${summary.total_marks_obtained} / ${summary.total_max_marks}`}
            sub="Across visible exams"
          />
          <SummaryCard title="Percentage" value={`${summary.percentage}%`} />
          <SummaryCard title="Grade" value={summary.grade} />
        </div>
      ) : null}

      <Card className="border-slate-100 p-5 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filter by exam</p>
        <div className="mt-3">
          <ExamTabs activeSlug={examTab} onChange={setExamTab} examTypes={examTypes} />
        </div>
      </Card>

      {examTab ? (
        <Card className="border-slate-100 p-5 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Report card & rank</p>
          {officialLoading ? (
            <p className="mt-3 text-sm text-slate-500">Loading result…</p>
          ) : officialResult ? (
            <div className="mt-4">
              <ResultDetail data={officialResult} studentId={sid} examType={examTab} showActions />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No ranked result for this exam yet.</p>
          )}
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading marks…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <MarksTable
            rows={results}
            onEdit={(row) => { setEditing(row); setModalOpen(true) }}
            onDelete={onDelete}
            busyId={busyId}
          />
          <MarksChart rows={results} />
        </div>
      )}

      <EditMarksModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSubmit={onSubmitModal}
        subjects={subjects}
        examTypes={examTypes}
        initial={editing}
        selectedStudentId={sid}
      />
    </div>
  )
}
