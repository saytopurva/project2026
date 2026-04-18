/** Percentage (0–100) → letter grade */

export function percentage(obtained, total) {
  const t = Number(total)
  const o = Number(obtained)
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(o)) return 0
  return Math.round((10000 * o) / t) / 100
}

export function letterGrade(pct) {
  const p = Number(pct)
  if (!Number.isFinite(p)) return '—'
  if (p >= 90) return 'A+'
  if (p >= 80) return 'A'
  if (p >= 70) return 'B+'
  if (p >= 60) return 'B'
  if (p >= 50) return 'C'
  if (p >= 40) return 'D'
  return 'F'
}
