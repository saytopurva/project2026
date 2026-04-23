import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { djangoClient } from '../services/djangoApi'
import { fetchStudentClasses } from '../services/studentService'
import {
  approveUser,
  createSchoolUser,
  fetchPendingUsers,
  rejectUser,
} from '../services/userAdminApi'
import { notify } from '../utils/notify'
import { formatApiError } from '../utils/formatApiError'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { rbacNavFlags, ROLE } from '../utils/rbac'

const ROLE_OPTIONS = [
  { value: ROLE.VICE_PRINCIPAL, label: 'Vice Principal' },
  { value: ROLE.CLASS_TEACHER, label: 'Class Teacher' },
  { value: ROLE.SUBJECT_TEACHER, label: 'Subject Teacher' },
  { value: ROLE.STAFF, label: 'Staff (Admin)' },
]

export function AdminUsersPage() {
  const { user, logout } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: ROLE.CLASS_TEACHER,
    assigned_class: '',
    assigned_subject: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pend, cls, { data: subj }] = await Promise.all([
        fetchPendingUsers(),
        fetchStudentClasses(),
        djangoClient.get('/api/subjects/'),
      ])
      setPending(pend)
      setClasses(cls)
      setSubjects(Array.isArray(subj) ? subj : [])
    } catch (e) {
      notify.error(formatApiError(e) || 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    const body = {
      name: createForm.name.trim(),
      email: createForm.email.trim().toLowerCase(),
      role: createForm.role,
      assigned_class: createForm.assigned_class.trim(),
    }
    if (createForm.role === ROLE.SUBJECT_TEACHER) {
      const sid = parseInt(createForm.assigned_subject, 10)
      if (!sid) {
        notify.error('Select a subject for subject teacher.')
        return
      }
      body.assigned_subject = sid
    } else {
      body.assigned_subject = null
    }
    if (createForm.role === ROLE.CLASS_TEACHER && !body.assigned_class) {
      notify.error('Assigned class is required for class teachers.')
      return
    }
    try {
      await createSchoolUser(body)
      notify.success('User created. They can sign in with email OTP.')
      setCreateForm({
        name: '',
        email: '',
        role: ROLE.CLASS_TEACHER,
        assigned_class: '',
        assigned_subject: '',
      })
      load()
    } catch (err) {
      notify.error(formatApiError(err) || 'Create failed.')
    }
  }

  const quickApprove = async (row) => {
    const role = window.prompt(
      'Assign role: vice_principal, class_teacher, subject_teacher, or staff',
      'class_teacher'
    )
    if (!role) return
    let assigned_class = ''
    let assigned_subject = null
    if (role === 'class_teacher') {
      assigned_class = window.prompt('Assigned class (exact label, e.g. 10A)', '') || ''
    }
    if (role === 'subject_teacher') {
      const sid = window.prompt('Subject ID (number)', '')
      assigned_subject = sid ? parseInt(sid, 10) : null
    }
    try {
      await approveUser(row.id, {
        role,
        assigned_class,
        assigned_subject,
      })
      notify.success('User approved.')
      load()
    } catch (err) {
      notify.error(formatApiError(err) || 'Approve failed.')
    }
  }

  if (!rbacNavFlags(user?.rbac).showAdminUsers) {
    return <Navigate to="/" replace />
  }

  return (
    <DashboardLayout user={user} title="User management" onLogout={logout}>
      <div className="space-y-10">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Add teacher / staff
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Only Principal and Vice Principal can create accounts. Users sign in with email OTP;
            no self-selected roles.
          </p>
          <form
            onSubmit={handleCreate}
            className="mt-4 grid max-w-xl gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              placeholder="Full name"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              type="email"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {createForm.role === ROLE.CLASS_TEACHER ? (
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={createForm.assigned_class}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, assigned_class: e.target.value }))
                }
                required
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : null}
            {createForm.role === ROLE.SUBJECT_TEACHER ? (
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={createForm.assigned_subject}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, assigned_subject: e.target.value }))
                }
                required
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="submit"
              className="rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Create user
            </button>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Pending approval
            </h2>
            <button
              type="button"
              onClick={load}
              className="text-sm text-sky-600 hover:underline"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="mt-2 text-sm text-slate-500">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No pending requests.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => quickApprove(p)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Approve…
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Reject ${p.email}?`)) return
                        try {
                          await rejectUser(p.id)
                          notify.success('Rejected.')
                          load()
                        } catch (err) {
                          notify.error(formatApiError(err) || 'Reject failed.')
                        }
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-600"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
