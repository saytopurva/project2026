import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { AttendancePage as AttendancePageView } from '../components/attendance/AttendancePage'
import { notify } from '../utils/notify'

export function AttendancePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    notify.info('You have been logged out.')
    navigate('/login', { replace: true })
  }

  return (
    <DashboardLayout user={user} title="Attendance" onLogout={handleLogout}>
      <AttendancePageView />
    </DashboardLayout>
  )
}
