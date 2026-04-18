import { CheckCircle2, ChevronRight, Plus, Star } from 'lucide-react'
import { Card } from '../Card'

/**
 * Shortcuts into enrollment and records flows.
 */
export function QuickActionsPanel({ onAddStudent, onMarkAttendance, onAddMarks }) {
  return (
    <Card
      compact
      className="border-slate-100 shadow-sm shadow-slate-200/30 transition-shadow duration-200 hover:shadow-md dark:border-slate-800 dark:shadow-slate-950/25"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick actions</h3>
      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Shortcuts</p>
      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onAddStudent}
          className="group flex w-full items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-left text-xs font-medium text-slate-800 transition-all duration-200 hover:border-sky-200 hover:bg-white hover:shadow-sm active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:bg-slate-800"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 transition-transform duration-200 group-hover:scale-105 dark:bg-sky-950/50 dark:text-sky-300">
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            Add student
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500 dark:text-slate-600 dark:group-hover:text-sky-400" />
        </button>
        <button
          type="button"
          onClick={onMarkAttendance}
          className="group flex w-full items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-left text-xs font-medium text-slate-800 transition-all duration-200 hover:border-emerald-200 hover:bg-white hover:shadow-sm active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-slate-800"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 transition-transform duration-200 group-hover:scale-105 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            Mark attendance
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-slate-600 dark:group-hover:text-emerald-400" />
        </button>
        <button
          type="button"
          onClick={onAddMarks}
          className="group flex w-full items-center justify-between rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-left text-xs font-medium text-slate-800 transition-all duration-200 hover:border-amber-200 hover:bg-white hover:shadow-sm active:scale-[0.99] dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-slate-800"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800 transition-transform duration-200 group-hover:scale-105 dark:bg-amber-950/40 dark:text-amber-300">
              <Star className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            Add marks
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-500 dark:text-slate-600 dark:group-hover:text-amber-400" />
        </button>
      </div>
    </Card>
  )
}
