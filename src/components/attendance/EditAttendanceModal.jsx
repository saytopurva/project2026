import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../Button'
import { InputField } from '../InputField'

const selectClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:[color-scheme:dark] dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40'

/**
 * @param {object} props
 * @param {object | null} props.record — row from API
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(payload: { date: string, status: string, reason: string }) => Promise<void>} props.onSave
 */
export function EditAttendanceModal({ record, open, onClose, onSave }) {
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('PRESENT')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!record) return
    setDate(record.date || '')
    setStatus(record.status || 'PRESENT')
    setReason(record.reason || '')
  }, [record])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !record) return null

  const showReason = status === 'ABSENT' || status === 'LEAVE'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (showReason && !reason.trim()) return
    setSaving(true)
    try {
      await onSave({
        date,
        status,
        reason: status === 'PRESENT' ? '' : reason.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit attendance</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <InputField id="edit-att-date" label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="w-full text-left">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LEAVE">Leave</option>
            </select>
          </div>
          {showReason ? (
            <div className="w-full text-left">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50"
              />
            </div>
          ) : null}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
