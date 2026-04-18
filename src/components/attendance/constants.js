/** @type {Record<string, { label: string, row: string, badge: string }>} */
export const STATUS_STYLE = {
  PRESENT: {
    label: 'Present',
    row: 'bg-emerald-50/80 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/50',
  },
  ABSENT: {
    label: 'Absent',
    row: 'bg-rose-50/80 dark:bg-rose-950/20',
    badge: 'bg-rose-100 text-rose-900 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/50',
  },
  LEAVE: {
    label: 'Leave',
    row: 'bg-amber-50/80 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50',
  },
}

export function statusMeta(status) {
  return STATUS_STYLE[status] || STATUS_STYLE.ABSENT
}
