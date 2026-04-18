import { NavLink } from 'react-router-dom'
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react'

const itemBase =
  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200'

function navIcon(Icon, isActive) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
        isActive
          ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400'
          : 'bg-slate-100/80 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600 dark:bg-slate-800/80 dark:text-slate-400 dark:group-hover:bg-sky-950/40 dark:group-hover:text-sky-400'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
    </span>
  )
}

function NavItem({ to, end, icon, label }) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <span
          className={`${itemBase} ${
            isActive
              ? 'bg-white text-sky-800 shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-800 dark:text-sky-200 dark:ring-slate-600'
              : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
          }`}
        >
          {navIcon(icon, isActive)}
          {label}
        </span>
      )}
    </NavLink>
  )
}

const subLink =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'

/**
 * Primary navigation + academic shortcuts (attendance / marks).
 */
export function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 lg:w-64 lg:border-b-0 lg:border-r lg:shadow-sm dark:border-slate-700/90 dark:from-slate-900 dark:to-slate-950 dark:shadow-slate-950/30">
      <div className="border-b border-slate-100 p-4 lg:p-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-bold text-white shadow-md ring-4 ring-sky-100/60 dark:ring-sky-900/50">
            S
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600/90 dark:text-sky-400/90">
              SMS
            </p>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Student Management
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-1 lg:p-3">
        <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/students" icon={Users} label="Students" />
        <NavItem to="/students/add" icon={UserPlus} label="Add student" />
        <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
        <NavItem to="/notices" icon={Megaphone} label="Notice board" />
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </nav>

      <div className="mt-auto hidden border-t border-slate-100 p-3 lg:block dark:border-slate-800">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Records
        </p>
        <div className="flex flex-col gap-0.5">
          <NavLink to="/attendance" className={subLink}>
            <BookOpenCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Attendance
          </NavLink>
          <NavLink to="/marks" className={subLink}>
            <Award className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            Marks
          </NavLink>
        </div>
      </div>

      <div className="flex gap-1 border-t border-slate-100 p-2 lg:hidden dark:border-slate-800">
        <NavLink
          to="/attendance"
          className="flex-1 rounded-lg bg-slate-50 py-2 text-center text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Attendance
        </NavLink>
        <NavLink
          to="/marks"
          className="flex-1 rounded-lg bg-slate-50 py-2 text-center text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Marks
        </NavLink>
      </div>
    </aside>
  )
}
