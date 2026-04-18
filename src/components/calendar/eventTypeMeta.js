import { BookOpenCheck, CalendarDays, ClipboardList, GraduationCap } from 'lucide-react'

export const EVENT_TYPES = /** @type {const} */ (['EVENT', 'PTM', 'HOLIDAY', 'EXAM'])

export function getEventTypeMeta(type) {
  switch (type) {
    case 'PTM':
      return {
        label: 'PTM',
        colorClass:
          'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60',
        dotClass: 'bg-sky-500',
        Icon: BookOpenCheck,
      }
    case 'HOLIDAY':
      return {
        label: 'Holiday',
        colorClass:
          'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
        dotClass: 'bg-emerald-500',
        Icon: CalendarDays,
      }
    case 'EXAM':
      return {
        label: 'Exam',
        colorClass:
          'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60',
        dotClass: 'bg-rose-500',
        Icon: GraduationCap,
      }
    default:
      return {
        label: 'Event',
        colorClass:
          'bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60',
        dotClass: 'bg-amber-500',
        Icon: ClipboardList,
      }
  }
}

