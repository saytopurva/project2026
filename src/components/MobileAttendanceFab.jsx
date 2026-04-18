import { NavLink } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'

/**
 * Thumb-friendly floating action — attendance in one tap (mobile / small screens).
 */
export function MobileAttendanceFab() {
  return (
    <NavLink
      to="/attendance/class"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-600/35 ring-4 ring-white/90 transition hover:scale-105 hover:shadow-2xl active:scale-95 dark:ring-slate-900/90 lg:hidden"
      title="Take attendance"
      aria-label="Take attendance"
    >
      <CalendarCheck className="h-7 w-7" strokeWidth={1.75} aria-hidden />
    </NavLink>
  )
}
