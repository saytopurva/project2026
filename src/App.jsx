import { Routes, Route, Navigate } from 'react-router-dom'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastHost } from './components/Toast'
import { LoginPage } from './pages/LoginPage'
import { OtpPage } from './pages/OtpPage'
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-otp" element={<OtpPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <StudentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/:id"
        element={
          <ProtectedRoute>
            <StudentProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/add"
        element={
          <ProtectedRoute>
            <AddStudentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/class"
        element={
          <ProtectedRoute>
            <ClassAttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marks"
        element={
          <ProtectedRoute>
            <MarksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance-report"
        element={
          <ProtectedRoute>
            <AttendanceReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notices"
        element={
          <ProtectedRoute>
            <NoticeBoardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
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
