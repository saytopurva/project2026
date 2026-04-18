import { useNavigate } from 'react-router-dom'
import { AttendanceAnalytics } from '../components/attendance/AttendanceAnalytics'
import { MarksDistributionTable } from '../components/dashboard/MarksDistributionTable'
import { SubjectPerformance } from '../components/dashboard/SubjectPerformance'
import { notify } from '../utils/notify'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'

/**
 * Dedicated analytics view — same modules as dashboard charts (full width focus).
 */
export function AnalyticsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  return (
    <DashboardLayout user={user} title="Analytics" onLogout={handleLogout}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Attendance trends, subject performance, and class marks distribution.
        </p>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AttendanceAnalytics showDefaulters />
          <SubjectPerformance />
        </div>
        <MarksDistributionTable />
      </div>
    </DashboardLayout>
  )
}
