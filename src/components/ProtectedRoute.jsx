import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Wrap routes that require a completed login (not pending OTP).
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, needsOtp } = useAuth()
  const location = useLocation()

  if (needsOtp) {
    return (
      <Navigate to="/verify-otp" replace state={{ from: location.pathname }} />
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
