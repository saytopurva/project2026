import { createElement } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { rbacNavFlags } from '../utils/rbac'
import {
  Award,
  BarChart3,
  Trophy,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  LayoutDashboard,
  Megaphone,
  PanelLeft,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react'

const itemBase =
  'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200'

const attendanceIconBox = (isActive) =>
  `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
    isActive
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/20 ring-1 ring-emerald-200/70 dark:ring-emerald-900/50'
      : 'bg-slate-100/90 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:bg-slate-800/80 dark:text-slate-400 dark:group-hover:bg-emerald-950/50 dark:group-hover:text-emerald-400'
  }`

const defaultIconBox = (isActive) =>
  `flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
    isActive
      ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/55 dark:text-sky-400'
      : 'bg-slate-100/90 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-700 dark:bg-slate-800/80 dark:text-slate-400 dark:group-hover:bg-sky-950/40 dark:group-hover:text-sky-400'
  }`

function NavSectionLabel({ children, collapsed }) {
  if (collapsed) return null
  return (
    <p className="mb-1 mt-2 px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 first:mt-0 dark:text-slate-500">
      {children}
    </p>
  )
}

function NavItem({ to, end, icon, label, collapsed }) {
  return (
    <NavLink to={to} end={end} title={collapsed ? label : undefined}>
      {({ isActive }) => (
        <span
          className={`${itemBase} ${
            collapsed ? 'justify-center px-2' : ''
          } ${
            isActive
              ? 'bg-white font-semibold text-sky-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-sky-100 dark:ring-slate-600/80'
              : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
          }`}
        >
          <span className={defaultIconBox(isActive)}>
            {createElement(icon, {
              className: 'h-[17px] w-[17px]',
              strokeWidth: 1.75,
              'aria-hidden': true,
            })}
          </span>
          {collapsed ? (
            <span className="sr-only">{label}</span>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </span>
      )}
    </NavLink>
  )
}

function AttendanceNavItem({ collapsed }) {
  const { pathname } = useLocation()
  const isActive = pathname.startsWith('/attendance')

  return (
    <NavLink to="/attendance/class" title={collapsed ? 'Attendance' : undefined}>
      <span
        className={`${itemBase} ${
          collapsed ? 'justify-center px-2' : ''
        } ${
          isActive
            ? 'bg-gradient-to-r from-emerald-50/95 to-white font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-200/80 dark:from-emerald-950/35 dark:to-slate-800 dark:text-emerald-100 dark:ring-emerald-800/50'
            : 'text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-900 dark:text-slate-200 dark:hover:bg-emerald-950/25'
        }`}
      >
        <span className={attendanceIconBox(isActive)}>
          <CalendarCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        {collapsed ? (
          <span className="sr-only">Attendance</span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
            <span className="truncate">Attendance</span>
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
              Live
            </span>
          </span>
        )}
      </span>
    </NavLink>
  )
}

const subLink =
  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'

/**
 * Fixed left nav — operations first, then main, insights, schedule, utilities.
 */
export function Sidebar({ collapsed = false, onToggleSidebar }) {
  const { user } = useAuth()
  const nav = rbacNavFlags(user?.rbac)
  const scopeLabel = user?.rbac?.rbac_label

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 transition-[width] duration-200 ease-out dark:border-slate-800/90 dark:from-slate-900 dark:to-slate-950 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:shadow-sm dark:lg:shadow-slate-950/25 ${
        collapsed ? 'lg:w-[4.25rem]' : 'lg:w-52'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800 lg:min-h-[3.25rem]">
        <div
          className={`flex min-w-0 flex-1 items-center gap-2.5 ${collapsed ? 'justify-center lg:flex-none' : ''}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-sky-100/50 dark:ring-sky-900/40">
            S
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-sky-600/90 dark:text-sky-400/90">
                SMS
              </p>
              <p className="truncate text-xs font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                {scopeLabel || 'Staff'}
              </p>
            </div>
          ) : (
            <span className="sr-only">Student Management</span>
          )}
        </div>
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700 lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            ) : (
              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <nav className="flex max-h-[min(60vh,420px)] flex-row gap-1 overflow-x-auto overscroll-x-contain p-2 lg:max-h-none lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:overflow-x-visible lg:p-2">
        {nav.showAttendance ? (
          <>
            <NavSectionLabel collapsed={collapsed}>Priority</NavSectionLabel>
            <AttendanceNavItem collapsed={collapsed} />
          </>
        ) : null}

        <NavSectionLabel collapsed={collapsed}>Main</NavSectionLabel>
        <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
        {nav.showStudents ? (
          <NavItem to="/students" icon={Users} label="Students" collapsed={collapsed} />
        ) : null}
        <NavItem to="/marks" icon={Award} label="Marks" collapsed={collapsed} />
        {nav.showResults ? (
          <NavItem to="/results" icon={Trophy} label="Results" collapsed={collapsed} />
        ) : null}

        {nav.showAnalytics ? (
          <>
            <NavSectionLabel collapsed={collapsed}>Insights</NavSectionLabel>
            <NavItem to="/analytics" icon={BarChart3} label="Analytics" collapsed={collapsed} />
          </>
        ) : null}

        <NavSectionLabel collapsed={collapsed}>Schedule</NavSectionLabel>
        <NavItem to="/calendar" icon={CalendarDays} label="Calendar" collapsed={collapsed} />

        <div className="hidden h-px bg-slate-100 dark:bg-slate-800 lg:my-1.5 lg:block" />
        <NavItem to="/notices" icon={Megaphone} label="Notices" collapsed={collapsed} />
        {nav.showAddStudent ? (
          <NavItem to="/students/add" icon={UserPlus} label="Add student" collapsed={collapsed} />
        ) : null}
        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      </nav>

      {!collapsed ? (
        nav.showAttendance || nav.showAttendanceReport ? (
          <div className="mt-auto hidden border-t border-slate-100 p-2 dark:border-slate-800 lg:block">
            <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Reports
            </p>
            <div className="flex flex-col gap-0.5">
              {nav.showAttendance ? (
                <NavLink to="/attendance" className={subLink}>
                  Single attendance
                </NavLink>
              ) : null}
              {nav.showAttendanceReport ? (
                <NavLink to="/attendance-report" className={subLink}>
                  <FileBarChart className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
                  Attendance report
                </NavLink>
              ) : null}
            </div>
          </div>
        ) : null
      ) : nav.showAttendance || nav.showAttendanceReport ? (
        <div className="mt-auto hidden flex-col items-center gap-1 border-t border-slate-100 p-2 dark:border-slate-800 lg:flex">
          {nav.showAttendanceReport ? (
            <NavLink
              to="/attendance-report"
              title="Attendance report"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-400"
            >
              <FileBarChart className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </NavLink>
          ) : null}
          {nav.showAttendance ? (
            <NavLink
              to="/attendance"
              title="Single attendance"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-400"
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </NavLink>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-1 border-t border-slate-100 p-2 lg:hidden dark:border-slate-800">
        {nav.showAttendance ? (
          <NavLink
            to="/attendance/class"
            className="flex-[1.4] rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-center text-[10px] font-bold text-white shadow-sm"
          >
            Attendance
          </NavLink>
        ) : null}
        <NavLink
          to="/"
          className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          Home
        </NavLink>
        <NavLink
          to="/marks"
          className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          Marks
        </NavLink>
        <NavLink
          to="/results"
          className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          Results
        </NavLink>
      </div>
    </aside>
  )
}
