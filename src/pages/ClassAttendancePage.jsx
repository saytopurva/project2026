import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { AttendanceAnalytics } from '../components/attendance/AttendanceAnalytics'
import { ClassAttendanceSheet } from '../components/attendance/ClassAttendanceSheet'
import { notify } from '../utils/notify'

export function ClassAttendancePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('sheet')

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  const tabClass = (id) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
      tab === id
        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
    }`

  return (
    <DashboardLayout user={user} title="Class attendance" onLogout={handleLogout}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200/90 pb-3 dark:border-slate-800">
          <button type="button" onClick={() => setTab('sheet')} className={tabClass('sheet')}>
            <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Mark attendance
          </button>
          <button type="button" onClick={() => setTab('analytics')} className={tabClass('analytics')}>
            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Analytics
          </button>
        </div>
        {tab === 'sheet' ? <ClassAttendanceSheet /> : <AttendanceAnalytics showDefaulters />}
      </div>
    </DashboardLayout>
  )
}
