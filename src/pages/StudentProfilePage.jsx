import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  User,
  Users,
  Wallet,
  ClipboardList,
} from 'lucide-react'
import { Card } from '../components/Card'
import { StudentAttendancePanel } from '../components/attendance/StudentAttendancePanel'
import { StudentResultsSection } from '../components/students/StudentResultsSection'
import { Button } from '../components/Button'
import { Loader } from '../components/Loader'
import { InputField } from '../components/InputField'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import {
  deleteCertificate,
  fetchStudentById,
  updateStudent,
  uploadCertificate,
} from '../services/studentService'

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

function ProgressBar({ value = 0, tone = 'sky' }) {
  const v = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0
  const bar =
    tone === 'emerald'
      ? 'from-emerald-500 to-teal-500'
      : tone === 'amber'
        ? 'from-amber-400 to-orange-500'
        : 'from-sky-500 to-indigo-500'
  return (
    <div className="mt-2">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700">
        <div
          className={cx('h-full rounded-full bg-gradient-to-r', bar)}
          style={{ width: `${v}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{v}%</p>
    </div>
  )
}

function TabButton(props) {
  const { active, onClick, icon, label } = props
  const Icon = icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition',
        active
          ? 'border-sky-200 bg-sky-50 text-sky-900 ring-4 ring-sky-100 dark:border-sky-700/70 dark:bg-sky-900/30 dark:text-sky-100 dark:ring-sky-900/40'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60'
      )}
    >
      {Icon ? <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : null}
      {label}
    </button>
  )
}

function EmptyHint({ title, detail }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  )
}

export function StudentProfilePage() {
  const { id } = useParams()
  const studentId = id ? String(id) : ''
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [student, setStudent] = useState(null)
  const [tab, setTab] = useState('overview')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    parent_email: '',
    parent_phone: '',
    student_class: '',
    roll_no: '',
    division: '',
    dob: '',
    gender: '',
    phone_number: '',
    address: '',
    height: '',
    weight: '',
    parents: {
      mother_name: '',
      father_name: '',
      parents_phone: '',
      parents_occupation: '',
    },
    academic: {
      attendance_percentage: '',
      overall_result: '',
      semester: '',
      performance: '',
      creativity: '',
      teacher_remarks: '',
    },
    fees: {
      fees_paid: false,
      amount: '',
      payment_date: '',
    },
  })

  const [certTitle, setCertTitle] = useState('')
  const [certYear, setCertYear] = useState('')
  const [certFile, setCertFile] = useState(null)
  const [certBusy, setCertBusy] = useState(false)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchStudentById(studentId)
      setStudent(data)
      // Keep the edit draft in sync when reloading.
      setForm({
        name: data?.name || '',
        email: data?.email || '',
        parent_email: data?.parent_email || '',
        parent_phone: data?.parent_phone || '',
        student_class: data?.student_class || '',
        roll_no: data?.roll_no ?? '',
        division: data?.division || '',
        dob: data?.dob || '',
        gender: data?.gender || '',
        phone_number: data?.phone_number || '',
        address: data?.address || '',
        height: data?.height ?? '',
        weight: data?.weight ?? '',
        parents: {
          mother_name: data?.parents?.mother_name || '',
          father_name: data?.parents?.father_name || '',
          parents_phone: data?.parents?.parents_phone || '',
          parents_occupation: data?.parents?.parents_occupation || '',
        },
        academic: {
          attendance_percentage: data?.academic?.attendance_percentage ?? '',
          overall_result: data?.academic?.overall_result || '',
          semester: data?.academic?.semester || '',
          performance: data?.academic?.performance || '',
          creativity: data?.academic?.creativity || '',
          teacher_remarks: data?.academic?.teacher_remarks || '',
        },
        fees: {
          fees_paid: Boolean(data?.fees?.fees_paid),
          amount: data?.fees?.amount ?? '',
          payment_date: data?.fees?.payment_date || '',
        },
      })
      setPhotoFile(null)
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not load student profile.'
      setLoadError(msg)
      notify.error(msg)
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const q = (searchParams.get('tab') || '').toLowerCase()
    if (q === 'results') {
      setTab('results')
    }
  }, [searchParams])

  useEffect(() => {
    if (location.state?.tab === 'results') {
      setTab('results')
    }
  }, [location.state])

  const onLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const headerMeta = useMemo(() => {
    if (!student) return { initials: '?', title: 'Student profile' }
    const initials = String(student.name || '?').trim().charAt(0).toUpperCase()
    return { initials, title: student.name || 'Student profile' }
  }, [student])

  const attendanceValue = editMode
    ? form.academic.attendance_percentage
    : student?.academic?.attendance_percentage ?? null
  const feesPaid = editMode ? Boolean(form.fees.fees_paid) : Boolean(student?.fees?.fees_paid)

  const startEdit = () => {
    setEditMode(true)
    notify.info('Edit mode enabled.')
  }

  const cancelEdit = () => {
    setEditMode(false)
    setPhotoFile(null)
    // Reset draft to current student snapshot
    if (student) {
      setForm((f) => ({
        ...f,
        name: student?.name || '',
        email: student?.email || '',
        parent_email: student?.parent_email || '',
        parent_phone: student?.parent_phone || '',
        student_class: student?.student_class || '',
        roll_no: student?.roll_no ?? '',
        division: student?.division || '',
        dob: student?.dob || '',
        gender: student?.gender || '',
        phone_number: student?.phone_number || '',
        address: student?.address || '',
        height: student?.height ?? '',
        weight: student?.weight ?? '',
        parents: {
          mother_name: student?.parents?.mother_name || '',
          father_name: student?.parents?.father_name || '',
          parents_phone: student?.parents?.parents_phone || '',
          parents_occupation: student?.parents?.parents_occupation || '',
        },
        academic: {
          attendance_percentage: student?.academic?.attendance_percentage ?? '',
          overall_result: student?.academic?.overall_result || '',
          semester: student?.academic?.semester || '',
          performance: student?.academic?.performance || '',
          creativity: student?.academic?.creativity || '',
          teacher_remarks: student?.academic?.teacher_remarks || '',
        },
        fees: {
          fees_paid: Boolean(student?.fees?.fees_paid),
          amount: student?.fees?.amount ?? '',
          payment_date: student?.fees?.payment_date || '',
        },
      }))
    }
  }

  const saveEdit = async () => {
    if (!studentId) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        parent_email: form.parent_email,
        parent_phone: form.parent_phone,
        student_class: form.student_class,
        roll_no: form.roll_no === '' ? null : Number(form.roll_no),
        division: form.division,
        dob: form.dob || null,
        gender: form.gender,
        phone_number: form.phone_number,
        address: form.address,
        height: form.height === '' ? null : Number(form.height),
        weight: form.weight === '' ? null : Number(form.weight),
        parents: { ...form.parents },
        academic: {
          ...form.academic,
          attendance_percentage:
            form.academic.attendance_percentage === ''
              ? null
              : Number(form.academic.attendance_percentage),
        },
        fees: {
          ...form.fees,
          amount: form.fees.amount === '' ? null : Number(form.fees.amount),
          payment_date: form.fees.payment_date || null,
        },
      }
      if (photoFile) payload.photo = photoFile

      const updated = await updateStudent(studentId, payload)
      setStudent(updated)
      setEditMode(false)
      setPhotoFile(null)
      notify.success('Student profile updated.')
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === 'string' ? e.response.data : null) ||
        e?.message ||
        'Could not save changes.'
      notify.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleUploadCertificate = async () => {
    if (!studentId) return
    if (!certTitle.trim()) return notify.error('Please enter certificate title.')
    if (!certFile) return notify.error('Please choose a PDF file.')
    setCertBusy(true)
    try {
      await uploadCertificate(studentId, {
        title: certTitle.trim(),
        year: certYear.trim() ? Number(certYear.trim()) : undefined,
        file: certFile,
      })
      setCertTitle('')
      setCertYear('')
      setCertFile(null)
      notify.success('Certificate uploaded.')
      await load()
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not upload certificate.'
      notify.error(msg)
    } finally {
      setCertBusy(false)
    }
  }

  const handleDeleteCertificate = async (certId) => {
    if (!certId) return
    const ok = window.confirm('Delete this certificate?')
    if (!ok) return
    try {
      await deleteCertificate(certId)
      notify.success('Certificate deleted.')
      await load()
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not delete certificate.'
      notify.error(msg)
    }
  }

  return (
    <DashboardLayout user={user} title="Student profile" onLogout={onLogout}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/students')}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                Back
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {headerMeta.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Complete profile, academics, fees, and certificates.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editMode ? (
              <>
                <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveEdit} loading={saving}>
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Save changes
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={startEdit}>
                <Pencil className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Edit
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <Loader label="Loading profile…" className="py-20" />
        ) : loadError ? (
          <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              {loadError}
            </p>
            <Button type="button" className="mt-4" onClick={load}>
              Retry
            </Button>
          </Card>
        ) : !student ? (
          <EmptyHint title="Student not found" detail="Go back to the directory and try again." />
        ) : (
          <>
            <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      className="h-16 w-16 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-2xl font-bold text-white shadow-md ring-4 ring-sky-100/80 dark:ring-sky-900/50">
                      {headerMeta.initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Class {student.student_class} • Roll {student.roll_no}
                    </p>
                    <p className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {student.email}
                    </p>
                    {editMode ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InputField
                            id="sp-name"
                            label="Name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          />
                          <InputField
                            id="sp-division"
                            label="Division"
                            value={form.division}
                            onChange={(e) => setForm((f) => ({ ...f, division: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InputField
                            id="sp-class"
                            label="Class"
                            value={form.student_class}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, student_class: e.target.value }))
                            }
                          />
                          <InputField
                            id="sp-roll"
                            label="Roll no"
                            type="number"
                            value={String(form.roll_no ?? '')}
                            onChange={(e) => setForm((f) => ({ ...f, roll_no: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="w-full text-left">
                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Photo
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setPhotoFile(e.target.files?.[0] || null)
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm text-slate-700 shadow-inner transition file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-200 dark:shadow-slate-950/40 dark:file:bg-slate-700 dark:file:text-slate-100 dark:hover:file:bg-slate-600"
                            />
                          </div>
                          <InputField
                            id="sp-email"
                            label="Email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InputField
                            id="sp-parent-email"
                            label="Parent email (reports)"
                            type="email"
                            value={form.parent_email}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, parent_email: e.target.value }))
                            }
                          />
                          <InputField
                            id="sp-parent-phone"
                            label="Parent phone"
                            value={form.parent_phone}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, parent_phone: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600">
                        <Users className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
                        Division {(editMode ? form.division : student.division) || '—'}
                      </span>
                      <span
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1',
                          feesPaid
                            ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/50'
                            : 'bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/50'
                        )}
                      >
                        <Wallet className="h-3.5 w-3.5" aria-hidden />
                        Fees {feesPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-2 md:w-auto md:min-w-[260px]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Attendance
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {attendanceValue === null || attendanceValue === undefined || attendanceValue === ''
                        ? '—'
                        : `${Number(attendanceValue).toFixed(0)}%`}
                    </p>
                    <ProgressBar value={attendanceValue || 0} tone="emerald" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Overall result
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {(editMode ? form.academic.overall_result : student.academic?.overall_result) || '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Semester {(editMode ? form.academic.semester : student.academic?.semester) || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <TabButton
                active={tab === 'overview'}
                onClick={() => setTab('overview')}
                icon={User}
                label="Overview"
              />
              <TabButton
                active={tab === 'academics'}
                onClick={() => setTab('academics')}
                icon={GraduationCap}
                label="Academics"
              />
              <TabButton
                active={tab === 'results'}
                onClick={() => setTab('results')}
                icon={Award}
                label="Results"
              />
              <TabButton
                active={tab === 'fees'}
                onClick={() => setTab('fees')}
                icon={Wallet}
                label="Fees"
              />
              <TabButton
                active={tab === 'attendance'}
                onClick={() => setTab('attendance')}
                icon={ClipboardList}
                label="Attendance"
              />
              <TabButton
                active={tab === 'certs'}
                onClick={() => setTab('certs')}
                icon={FileText}
                label="Certificates"
              />
            </div>

            {tab === 'attendance' ? (
              <StudentAttendancePanel studentId={studentId} />
            ) : null}

            {tab === 'results' ? <StudentResultsSection studentId={studentId} /> : null}

            {tab === 'overview' ? (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30 lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Personal information
                    </h3>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        DOB
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {student.dob || '—'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Gender: {student.gender || '—'}
                      </p>
                      {editMode ? (
                        <div className="mt-3 grid gap-3">
                          <InputField
                            id="sp-dob"
                            label="DOB"
                            type="date"
                            value={form.dob}
                            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                          />
                          <InputField
                            id="sp-gender"
                            label="Gender"
                            value={form.gender}
                            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                            placeholder="Male / Female / Other"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        Phone
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {student.phone_number || '—'}
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0">{student.address || '—'}</span>
                      </p>
                      {editMode ? (
                        <div className="mt-3 grid gap-3">
                          <InputField
                            id="sp-phone"
                            label="Phone"
                            value={form.phone_number}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, phone_number: e.target.value }))
                            }
                          />
                          <div className="w-full text-left">
                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                              Address
                            </label>
                            <textarea
                              value={form.address}
                              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                              rows={3}
                              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-white/50 transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                              placeholder="Address"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Height / Weight
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {(editMode ? form.height : student.height)
                          ? `${editMode ? form.height : student.height} cm`
                          : '—'}{' '}
                        •{' '}
                        {(editMode ? form.weight : student.weight)
                          ? `${editMode ? form.weight : student.weight} kg`
                          : '—'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Division: {(editMode ? form.division : student.division) || '—'}
                      </p>
                      {editMode ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <InputField
                            id="sp-height"
                            label="Height"
                            type="number"
                            value={String(form.height ?? '')}
                            onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                            placeholder="cm"
                          />
                          <InputField
                            id="sp-weight"
                            label="Weight"
                            type="number"
                            value={String(form.weight ?? '')}
                            onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                            placeholder="kg"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        Parent contact
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {(editMode ? form.parents.parents_phone : student.parents?.parents_phone) || '—'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Mother: {(editMode ? form.parents.mother_name : student.parents?.mother_name) || '—'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Father: {(editMode ? form.parents.father_name : student.parents?.father_name) || '—'}
                      </p>
                      {editMode ? (
                        <div className="mt-3 grid gap-3">
                          <InputField
                            id="sp-mother"
                            label="Mother name"
                            value={form.parents.mother_name}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                parents: { ...f.parents, mother_name: e.target.value },
                              }))
                            }
                          />
                          <InputField
                            id="sp-father"
                            label="Father name"
                            value={form.parents.father_name}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                parents: { ...f.parents, father_name: e.target.value },
                              }))
                            }
                          />
                          <InputField
                            id="sp-pphone"
                            label="Parents phone"
                            value={form.parents.parents_phone}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                parents: { ...f.parents, parents_phone: e.target.value },
                              }))
                            }
                          />
                          <InputField
                            id="sp-pocc"
                            label="Parents occupation"
                            value={form.parents.parents_occupation}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                parents: { ...f.parents, parents_occupation: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>

                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
                  <div className="flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Teacher notes
                    </h3>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Performance
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {(editMode ? form.academic.performance : student.academic?.performance) || '—'}
                      </p>
                      {editMode ? (
                        <div className="mt-3 w-full text-left">
                          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Edit performance
                          </label>
                          <textarea
                            value={form.academic.performance}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                academic: { ...f.academic, performance: e.target.value },
                              }))
                            }
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-white/50 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                            placeholder="Write performance remarks…"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Creativity / Skills
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {(editMode ? form.academic.creativity : student.academic?.creativity) || '—'}
                      </p>
                      {editMode ? (
                        <div className="mt-3 w-full text-left">
                          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Edit creativity / skills
                          </label>
                          <textarea
                            value={form.academic.creativity}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                academic: { ...f.academic, creativity: e.target.value },
                              }))
                            }
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-white/50 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                            placeholder="Skills, hobbies, talents…"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Remarks
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {(editMode ? form.academic.teacher_remarks : student.academic?.teacher_remarks) || '—'}
                      </p>
                      {editMode ? (
                        <div className="mt-3 w-full text-left">
                          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Edit remarks
                          </label>
                          <textarea
                            value={form.academic.teacher_remarks}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                academic: { ...f.academic, teacher_remarks: e.target.value },
                              }))
                            }
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-inner shadow-white/50 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:focus:border-sky-500 dark:focus:bg-slate-900 dark:focus:ring-sky-900/40"
                            placeholder="Teacher remarks…"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === 'academics' ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Attendance
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Stored attendance % for this student.
                  </p>
                  <ProgressBar value={attendanceValue || 0} tone="emerald" />
                  {editMode ? (
                    <div className="mt-4">
                      <InputField
                        id="sp-att"
                        label="Attendance %"
                        type="number"
                        value={String(form.academic.attendance_percentage ?? '')}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            academic: { ...f.academic, attendance_percentage: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ) : null}
                </Card>

                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Semester result
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Overall performance snapshot.
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Result
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                      {student.academic?.overall_result || '—'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Semester: {student.academic?.semester || '—'}
                    </p>
                    {editMode ? (
                      <div className="mt-4 grid gap-3">
                        <InputField
                          id="sp-res"
                          label="Overall result"
                          value={form.academic.overall_result}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              academic: { ...f.academic, overall_result: e.target.value },
                            }))
                          }
                        />
                        <InputField
                          id="sp-sem"
                          label="Semester"
                          value={form.academic.semester}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              academic: { ...f.academic, semester: e.target.value },
                            }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === 'fees' ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Fees status
                    </h3>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Status
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                      {feesPaid ? 'Paid' : 'Unpaid'}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Amount: {(editMode ? form.fees.amount : student.fees?.amount) ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Payment date: {(editMode ? form.fees.payment_date : student.fees?.payment_date) || '—'}
                    </p>
                    {editMode ? (
                      <div className="mt-4 grid gap-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(form.fees.fees_paid)}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                fees: { ...f.fees, fees_paid: e.target.checked },
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-300 dark:border-slate-600 dark:bg-slate-900"
                          />
                          Fees paid
                        </label>
                        <InputField
                          id="sp-fee-amt"
                          label="Amount"
                          type="number"
                          value={String(form.fees.amount ?? '')}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              fees: { ...f.fees, amount: e.target.value },
                            }))
                          }
                        />
                        <InputField
                          id="sp-fee-date"
                          label="Payment date"
                          type="date"
                          value={form.fees.payment_date}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              fees: { ...f.fees, payment_date: e.target.value },
                            }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </Card>
                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
                  <EmptyHint
                    title={editMode ? 'Tip' : 'Edit fees'}
                    detail={
                      editMode
                        ? 'Use Save changes at the top-right to persist all edits.'
                        : 'Click Edit to update fees, academics, parents and personal details.'
                    }
                  />
                </Card>
              </div>
            ) : null}

            {tab === 'certs' ? (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30 lg:col-span-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Certificates
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    PDFs uploaded for this student.
                  </p>

                  <div className="mt-4 space-y-3">
                    {student.certificates?.length ? (
                      student.certificates.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {c.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Year: {c.year || '—'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {c.file_url ? (
                              <a
                                href={c.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/60"
                              >
                                <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                                Download
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteCertificate(c.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 shadow-sm transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyHint
                        title="No certificates yet"
                        detail="Upload a PDF certificate using the form on the right."
                      />
                    )}
                  </div>
                </Card>

                <Card className="border-slate-100 shadow-md shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Upload PDF
                    </h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Title
                    </label>
                    <input
                      value={certTitle}
                      onChange={(e) => setCertTitle(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
                      placeholder="e.g. Science Olympiad"
                    />
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Year (optional)
                    </label>
                    <input
                      value={certYear}
                      onChange={(e) => setCertYear(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-900/40"
                      placeholder="2026"
                      inputMode="numeric"
                    />
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      PDF file
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:file:bg-slate-700 dark:file:text-slate-100 dark:hover:file:bg-slate-600"
                    />
                    <Button type="button" className="w-full" onClick={handleUploadCertificate} disabled={certBusy}>
                      <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      {certBusy ? 'Uploading…' : 'Upload'}
                    </Button>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Uploaded files are served from Django <span className="font-mono">/media/</span>.
                    </p>
                  </div>
                </Card>
              </div>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

