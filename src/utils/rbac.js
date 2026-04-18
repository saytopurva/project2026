/** Role helpers — backend enforces rules; this is for UI only. */

export const ROLE = {
  PRINCIPAL: 'principal',
  VICE_PRINCIPAL: 'vice_principal',
  CLASS_TEACHER: 'class_teacher',
  SUBJECT_TEACHER: 'subject_teacher',
}

/**
 * @param {Record<string, unknown> | null | undefined} rbac — payload from GET /api/me/
 */
export function rbacNavFlags(rbac) {
  const role = rbac?.role
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
    }
  }
  const isPrivileged =
    role === ROLE.PRINCIPAL || role === ROLE.VICE_PRINCIPAL
  const isSubject = role === ROLE.SUBJECT_TEACHER

  return {
    isPrivileged,
    isSubjectTeacher: isSubject,
    showAttendance: !isSubject,
    showAttendanceReport: !isSubject,
    showResults: !isSubject,
    showAnalytics: !isSubject,
    showAddStudent: isPrivileged,
    showNotices: true,
    showCalendar: true,
    showSettings: true,
    showStudents: true,
    showMarks: true,
    showDashboard: true,
    canManageTeachers: isPrivileged,
  }
}
