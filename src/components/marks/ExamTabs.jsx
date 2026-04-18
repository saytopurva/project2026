function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

import { maxMarksForExamType } from '../../utils/marksConstants'

/**
 * @param {{ activeSlug: string | null, onChange: (slug: string | null) => void, examTypes: Array<{slug:string,name?:string,max_marks?:number}>, showAllOption?: boolean }} props
 */
export function ExamTabs({ activeSlug, onChange, examTypes, showAllOption = true }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {showAllOption ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cx(
            'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
            activeSlug === null
              ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-100'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
          )}
        >
          All
        </button>
      ) : null}
      {examTypes.map((et) => {
        const max = maxMarksForExamType(et)
        const suffix = max != null ? ` (${max})` : ''
        return (
          <button
            key={et.slug}
            type="button"
            onClick={() => onChange(et.slug)}
            className={cx(
              'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
              activeSlug === et.slug
                ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
            )}
            title={max != null ? `Out of ${max} marks` : undefined}
          >
            {et.name || et.slug}
            {suffix}
          </button>
        )
      })}
    </div>
  )
}
