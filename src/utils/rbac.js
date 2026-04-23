/** Role helpers — backend enforces rules; this is for UI only. */

export const ROLE = {
  PRINCIPAL: 'principal',
  VICE_PRINCIPAL: 'vice_principal',
  CLASS_TEACHER: 'class_teacher',
  SUBJECT_TEACHER: 'subject_teacher',
  STAFF: 'staff',
  UNASSIGNED: 'unassigned',
}

export const APPROVAL = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

/**
 * @param {Record<string, unknown> | null | undefined} rbac — payload from GET /api/me/
 */
export function rbacNavFlags(rbac) {
  const role = rbac?.role
  const canAccess = rbac?.can_access_app !== false
  const pending =
    rbac?.approval_status === APPROVAL.PENDING && role === ROLE.UNASSIGNED
  const rejected = rbac?.approval_status === APPROVAL.REJECTED

  if (!canAccess || pending || rejected) {
    return {
      isPrivileged: false,
      isSubjectTeacher: false,
      showAttendance: false,
      showAttendanceReport: false,
      showResults: false,
      showAnalytics: false,
      showAddStudent: false,
      showNotices: false,
      showCalendar: false,
      showSettings: false,
      showStudents: false,
      showMarks: false,
      showDashboard: false,
      canManageTeachers: false,
      showAdminUsers: false,
    }
  }

  if (!role) {
    return {
      isPrivileged: false,
      isSubjectTeacher: false,
      showAttendance: true,
      showAttendanceReport: true,
      showResults: true,
      showAnalytics: true,
      showAddStudent: false,
      showNotices: true,
      showCalendar: true,
      showSettings: true,
      showStudents: true,
      showMarks: true,
      showDashboard: true,
      canManageTeachers: false,
      showAdminUsers: false,
    }
  }

  const isPrivileged =
    role === ROLE.PRINCIPAL || role === ROLE.VICE_PRINCIPAL
  const isSubject = role === ROLE.SUBJECT_TEACHER
  const isStaff = role === ROLE.STAFF

  return {
    isPrivileged,
    isSubjectTeacher: isSubject,
    isStaff,
    // Subject teachers have read-only attendance and subject-scoped analytics/results.
    showAttendance: true,
    showAttendanceReport: !isSubject,
    showResults: true,
    showAnalytics: true,
    showAddStudent: isPrivileged,
    showNotices: true,
    showCalendar: true,
    showSettings: true,
    showStudents: true,
    showMarks: true,
    showDashboard: true,
    canManageTeachers: isPrivileged,
    showAdminUsers: isPrivileged,
  }
}
