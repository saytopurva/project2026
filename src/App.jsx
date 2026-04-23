import { Routes, Route, Navigate } from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedLayout } from './components/ProtectedLayout'
import { ToastHost } from './components/Toast'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { StudentsPage } from './pages/StudentsPage'
import { AddStudentPage } from './pages/AddStudentPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { AttendancePage } from './pages/AttendancePage'
import { ClassAttendancePage } from './pages/ClassAttendancePage'
import { MarksPage } from './pages/MarksPage'
import { ResultsPage } from './pages/ResultsPage'
import { AttendanceReportPage } from './pages/AttendanceReportPage'
import { NoticeBoardPage } from './pages/NoticeBoardPage'
import { CalendarPage } from './pages/CalendarPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { SchedulePage } from './pages/SchedulePage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/student/:id" element={<StudentProfilePage />} />
        <Route path="/students/add" element={<AddStudentPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/class" element={<ClassAttendancePage />} />
        <Route path="/marks" element={<MarksPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/attendance-report" element={<AttendanceReportPage />} />
        <Route path="/notices" element={<NoticeBoardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AuthProvider>
        <AppRoutes />
        <ToastHost />
      </AuthProvider>
    </div>
  )
}
