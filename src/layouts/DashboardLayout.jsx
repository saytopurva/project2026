import { useCallback, useMemo, useState } from 'react'
import { Navbar } from '../components/Navbar'
import { PageTransition } from '../components/PageTransition'
import { Sidebar } from '../components/Sidebar'
import { MobileAttendanceFab } from '../components/MobileAttendanceFab'
import { useAuth } from '../hooks/useAuth'
import { rbacNavFlags } from '../utils/rbac'

const SIDEBAR_COLLAPSED_KEY = 'sms-sidebar-collapsed'

function readInitialSidebarCollapsed() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Authenticated app shell: compact sidebar + top bar + main (card-friendly grid pages).
 */
export function DashboardLayout({ user, title, onLogout, children, headerSearch }) {
  const { user: authUser } = useAuth()
  const nav = useMemo(() => rbacNavFlags(authUser?.rbac), [authUser?.rbac])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readInitialSidebarCollapsed)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const next = !c
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/95 lg:flex-row dark:bg-slate-950">
      <Sidebar collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={title} user={user} onLogout={onLogout} headerSearch={headerSearch} />
        <main className="flex-1 overflow-auto px-3 pb-20 pt-3 sm:px-4 sm:pb-6 sm:pt-4 lg:px-5 lg:pb-6 lg:pt-4">
          <div className="w-full max-w-[1600px]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
      {nav.showAttendance ? <MobileAttendanceFab /> : null}
    </div>
  )
}
