import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { CalendarPlus, FileText } from 'lucide-react'
import { Button } from '../Button'
import { Card } from '../Card'
import { FormMessage } from '../FormMessage'
import { InputField } from '../InputField'
import { createEvent } from '../../services/eventService'
import { EVENT_TYPES, getEventTypeMeta } from './eventTypeMeta'

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function AddEventForm({ defaultDate, onCreated }) {
  const initialDate = useMemo(
    () => (defaultDate ? format(defaultDate, 'yyyy-MM-dd') : todayKey()),
    [defaultDate]
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(initialDate)
  const [eventType, setEventType] = useState('EVENT')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Please enter a title.' })
      return
    }
    if (!date) {
      setMessage({ type: 'error', text: 'Please choose a date.' })
      return
    }
    setSubmitting(true)
    try {
      const created = await createEvent({
        title: title.trim(),
        description: description.trim(),
        date,
        event_type: eventType,
      })
      setTitle('')
      setDescription('')
      setMessage({ type: 'success', text: 'Event added to calendar.' })
      onCreated?.(created)
    } catch (e2) {
      const detail =
        e2?.response?.data?.detail ||
        (typeof e2?.response?.data === 'object' && JSON.stringify(e2.response.data)) ||
        e2?.message ||
        'Could not create event.'
      setMessage({ type: 'error', text: String(detail) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-sky-100/80 shadow-md shadow-sky-100/30 dark:border-sky-900/40 dark:shadow-slate-950/30">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
          <CalendarPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add event</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">PTM, holiday, exam, or general event</p>
        </div>
      </div>

      <FormMessage type={message.type} message={message.text} />

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <InputField
          id="ev-title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Unit test — Grade 7"
          disabled={submitting}
        />

        <div className="w-full text-left">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="ev-desc">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden />
            <textarea
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={submitting}
              placeholder="Any details teachers should know…"
              className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="w-full text-left">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="ev-date">
              Date
            </label>
            <input
              id="ev-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
            />
          </div>

          <div className="w-full text-left">
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="ev-type">
              Event type
            </label>
            <select
              id="ev-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              disabled={submitting}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
            >
              {EVENT_TYPES.map((t) => {
                const meta = getEventTypeMeta(t)
                return (
                  <option key={t} value={t}>
                    {meta.label}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={submitting}>
          Add to calendar
        </Button>
      </form>
    </Card>
  )
}

