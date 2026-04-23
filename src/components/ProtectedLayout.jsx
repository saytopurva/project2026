import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PendingApprovalPage } from '../pages/PendingApprovalPage'
import { AccessRejectedPage } from '../pages/AccessRejectedPage'
import { ROLE, APPROVAL } from '../utils/rbac'

/**
 * Requires JWT login, then blocks UNASSIGNED pending / rejected users from the main app shell.
 */
export function ProtectedLayout() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const rbac = user?.rbac

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (rbac?.approval_status === APPROVAL.REJECTED) {
    return <AccessRejectedPage />
  }

  if (
    rbac?.can_access_app === false &&
    rbac?.approval_status === APPROVAL.PENDING &&
    rbac?.role === ROLE.UNASSIGNED
  ) {
    return <PendingApprovalPage />
  }

  return <Outlet />
}
