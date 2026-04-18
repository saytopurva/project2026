import { useState } from 'react'
import { Pin, Send } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { FormMessage } from '../FormMessage'
import { InputField } from '../InputField'
import { createNotice } from '../../services/noticeService'

/**
 * Create notice — JSON or multipart when a file is selected.
 */
export function CreateNoticeForm({ onCreated }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isImportant, setIsImportant] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const reset = () => {
    setTitle('')
    setContent('')
    setIsImportant(false)
    setAttachment(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    if (!title.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Please enter a title and message body.' })
      return
    }
    setSubmitting(true)
    try {
      const created = await createNotice({
        title,
        content,
        isImportant,
        attachment,
      })
      reset()
      setMessage({ type: 'success', text: 'Notice posted successfully.' })
      onCreated?.(created)
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'object' && JSON.stringify(err.response.data)) ||
        err?.message ||
        'Could not post notice.'
      setMessage({ type: 'error', text: String(detail) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-sky-100/80 shadow-md shadow-sky-100/30 dark:border-sky-900/40 dark:shadow-slate-950/30">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
          <Send className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create notice</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Visible to all signed-in staff</p>
        </div>
      </div>

      <FormMessage type={message.type} message={message.text} />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <InputField
          id="notice-title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. PTA meeting — Thursday 4pm"
          disabled={submitting}
        />
        <div className="w-full text-left">
          <label
            htmlFor="notice-content"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Message
          </label>
          <textarea
            id="notice-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Write the full notice…"
            disabled={submitting}
            className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-3 transition hover:border-amber-200/80 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-amber-800/60">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-500 dark:bg-slate-800"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
              <Pin className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} aria-hidden />
              Mark as important
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Highlights this notice for everyone on the board.
            </span>
          </span>
        </label>

        <div className="w-full text-left">
          <label
            htmlFor="notice-file"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Attachment <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="notice-file"
            type="file"
            disabled={submitting}
            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-800 hover:file:bg-sky-100 dark:text-slate-400 dark:file:bg-sky-950/50 dark:file:text-sky-200 dark:hover:file:bg-sky-900/60"
          />
        </div>

        <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={submitting}>
          Publish notice
        </Button>
      </form>
    </Card>
  )
}
