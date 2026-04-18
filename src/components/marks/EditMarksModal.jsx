import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../Button'
import { InputField } from '../InputField'
import { notify } from '../../utils/notify'
import { formatApiError } from '../../utils/formatApiError'
import { maxMarksForExamType } from '../../utils/marksConstants'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSubmit: (payload: object) => Promise<void>,
 *   subjects: Array<{id:number,name:string}>,
 *   examTypes: Array<{id:number,slug:string,name?:string,max_marks?:number}>,
 *   initial: object | null,
 *   selectedStudentId?: number,
 *   students?: Array<{id:number,name:string}>,
 * }} props
 */
export function EditMarksModal({
  open,
  onClose,
  onSubmit,
  subjects,
  examTypes,
  initial,
  selectedStudentId,
  students = [],
}) {
  const [subjectId, setSubjectId] = useState('')
  const [examTypeId, setExamTypeId] = useState('')
  const [obtained, setObtained] = useState('')
  const [examDate, setExamDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickStudentId, setPickStudentId] = useState('')
  const panelRef = useRef(null)

  const sessionKey = initial ? `edit-${initial.id}` : 'new'

  const selectedExamType = useMemo(
    () => examTypes.find((e) => String(e.id) === String(examTypeId)),
    [examTypes, examTypeId],
  )

  const maxForExam = maxMarksForExamType(selectedExamType)

  useEffect(() => {
    if (!open) return
    panelRef.current?.scrollTo?.(0, 0)
  }, [open, sessionKey])

  useEffect(() => {
    if (!open) return
    if (initial) {
      setSubjectId(String(initial.subject ?? ''))
      setExamTypeId(String(initial.exam_type ?? ''))
      setObtained(String(initial.marks_obtained ?? ''))
      setExamDate(initial.exam_date || '')
      setPickStudentId(String(initial.student ?? ''))
    } else {
      setSubjectId('')
      setObtained('')
      setExamDate(new Date().toISOString().slice(0, 10))
      setExamTypeId('')
      setPickStudentId(
        selectedStudentId != null && !Number.isNaN(Number(selectedStudentId))
          ? String(selectedStudentId)
          : '',
      )
    }
  }, [open, sessionKey, initial, selectedStudentId])

  useEffect(() => {
    if (!open || initial) return
    if (selectedStudentId != null && !Number.isNaN(Number(selectedStudentId))) return
    if (pickStudentId) return
    const first = students[0]?.id
    if (first) setPickStudentId(String(first))
  }, [open, initial, selectedStudentId, students, pickStudentId])

  useEffect(() => {
    if (!open || initial) return
    if (examTypes.length && !examTypeId) {
      setExamTypeId(String(examTypes[0].id))
    }
  }, [open, initial, examTypes, examTypeId])

  if (!open) return null

  const hasFixedStudent =
    selectedStudentId != null &&
    Number.isFinite(Number(selectedStudentId)) &&
    Number(selectedStudentId) > 0

  const handleSave = async () => {
    const mo = parseFloat(obtained)
    const fromProp =
      selectedStudentId != null && !Number.isNaN(Number(selectedStudentId))
        ? Number(selectedStudentId)
        : null
    const fromPick = pickStudentId ? Number(pickStudentId) : NaN
    const sid = initial?.student ?? fromProp ?? (Number.isFinite(fromPick) ? fromPick : NaN)
    if (!Number.isFinite(sid)) {
      notify.error('Choose a student.')
      return
    }
    if (!subjectId) {
      notify.error('Select a subject.')
      return
    }
    if (!examTypeId || !examDate) {
      notify.error('Exam type and date are required.')
      return
    }
    if (Number.isNaN(mo)) {
      notify.error('Enter marks obtained.')
      return
    }
    const cap = maxForExam
    if (cap != null && mo > cap) {
      notify.error(`Marks obtained cannot exceed ${cap} for this exam type.`)
      return
    }
    if (mo < 0) {
      notify.error('Marks obtained cannot be negative.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        id: initial?.id,
        student: sid,
        subject: Number(subjectId),
        exam_type: Number(examTypeId),
        marks_obtained: mo,
        exam_date: examDate,
      })
      onClose()
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not save marks.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        ref={panelRef}
        className={cx(
          'max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl',
          'dark:border-slate-700 dark:bg-slate-900',
        )}
        role="dialog"
        aria-modal
        aria-labelledby="marks-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="marks-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {initial ? 'Edit marks' : 'Add marks'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Maximum marks are set automatically from the exam type (Unit Test 20, Mid Sem 50, Semester 100).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {!initial && students.length > 0 && !hasFixedStudent ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Student</label>
              <select
                value={pickStudentId}
                onChange={(e) => setPickStudentId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50"
              >
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/80"
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {subjects.length === 0 ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                No subjects from the server. Run{' '}
                <code className="rounded bg-slate-200/80 px-1 dark:bg-slate-800">python manage.py migrate</code> and
                keep Django running with Vite.
              </p>
            ) : null}

            <label className="mb-2 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Exam type</label>
            <select
              value={examTypeId}
              onChange={(e) => setExamTypeId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/80"
            >
              {examTypes.length === 0 ? (
                <option value="">Loading exam types…</option>
              ) : (
                examTypes.map((et) => {
                  const max = maxMarksForExamType(et)
                  const label = et.name || et.slug
                  const suffix = max != null ? ` (Out of ${max})` : ''
                  return (
                    <option key={et.id} value={et.id}>
                      {label}
                      {suffix}
                    </option>
                  )
                })
              )}
            </select>
          </div>

          <div>
            <InputField
              id="marks-obtained"
              label="Marks obtained"
              type="number"
              step="any"
              min={0}
              max={maxForExam != null ? maxForExam : undefined}
              value={obtained}
              onChange={(e) => setObtained(e.target.value)}
            />
            {maxForExam != null ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter a score from 0 to {maxForExam} (this exam is out of {maxForExam}).
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select an exam type to see the maximum marks.
              </p>
            )}
          </div>

          <InputField
            id="marks-exam-date"
            label="Exam date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="button" variant="primary" loading={saving} onClick={handleSave}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
