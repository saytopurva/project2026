import { useNavigate } from 'react-router-dom'
import { ArrowRight, GraduationCap, Hash, Mail } from 'lucide-react'

export function StudentCard({ student }) {
  const navigate = useNavigate()
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/student/${student.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/student/${student.id}`)
      }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-600 dark:focus:ring-sky-900/40"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-sky-100/80 to-indigo-50/60 opacity-70 transition-transform duration-500 group-hover:scale-110 dark:from-sky-900/40 dark:to-indigo-950/40" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-lg font-bold text-white shadow-md ring-4 ring-sky-100/80 dark:ring-sky-900/50">
              {(student.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {student.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <span className="truncate">{student.email}</span>
              </p>
            </div>
          </div>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500 dark:text-slate-600 dark:group-hover:text-sky-400"
            aria-hidden
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600">
            <GraduationCap className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
            Class {student.student_class}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600">
            <Hash className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden />
            Roll {student.roll_no}
          </span>
        </div>
      </div>
    </article>
  )
}
