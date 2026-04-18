import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { FormMessage } from '../components/FormMessage'
import { InputField } from '../components/InputField'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { createStudent } from '../services/studentService'

/**
 * Dedicated add-student form — Django POST with inline feedback.
 */
export function AddStudentPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [formMessage, setFormMessage] = useState({ type: '', text: '' })
  const [form, setForm] = useState({
    name: '',
    email: '',
    student_class: '',
    roll_no: '',
  })

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage({ type: '', text: '' })
    const roll = parseInt(form.roll_no, 10)
    if (!form.name.trim() || !form.email.trim() || !form.student_class.trim()) {
      const msg = 'Please fill in name, email, and course / class.'
      setFormMessage({ type: 'error', text: msg })
      notify.error(msg)
      return
    }
    if (Number.isNaN(roll)) {
      const msg = 'Roll number must be a valid number.'
      setFormMessage({ type: 'error', text: msg })
      notify.error(msg)
      return
    }
    setSaving(true)
    try {
      await createStudent({
        name: form.name.trim(),
        email: form.email.trim(),
        student_class: form.student_class.trim(),
        roll_no: roll,
      })
      const ok = 'Student saved successfully.'
      setFormMessage({ type: 'success', text: ok })
      notify.success(ok)
      setForm({ name: '', email: '', student_class: '', roll_no: '' })
    } catch (e) {
      const err = e?.response?.data
      const msg =
        typeof err === 'object'
          ? JSON.stringify(err)
          : err || e?.message || 'Could not save student.'
      setFormMessage({ type: 'error', text: msg })
      notify.error(typeof msg === 'string' ? msg : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout user={user} title="Add student" onLogout={handleLogout}>
      <div className="mx-auto max-w-2xl space-y-8">
        <button
          type="button"
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Back to directory
        </button>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Enroll a new student
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Fields align with your Django{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800 dark:text-slate-200">
              Student
            </code>{' '}
            model.
          </p>
        </div>

        <Card className="border-slate-100 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:shadow-slate-950/40">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:ring-sky-900/50">
              <UserPlus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Student details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">All fields are required.</p>
            </div>
          </div>

          <FormMessage type={formMessage.type} message={formMessage.text} />

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <InputField
              id="add-name"
              label="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Priya Sharma"
            />
            <InputField
              id="add-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="student@school.edu"
            />
            <InputField
              id="add-class"
              label="Course / class"
              value={form.student_class}
              onChange={(e) => setForm((f) => ({ ...f, student_class: e.target.value }))}
              placeholder="e.g. CS-101, 10-A"
            />
            <InputField
              id="add-roll"
              label="Roll number"
              value={form.roll_no}
              onChange={(e) => setForm((f) => ({ ...f, roll_no: e.target.value }))}
              placeholder="Numeric roll no."
            />
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" fullWidth loading={saving} className="sm:flex-1">
                Save student
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="sm:flex-1"
                onClick={() => navigate('/students')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
