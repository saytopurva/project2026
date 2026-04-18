/** Fallback if API omits max_marks (matches backend marks.exam_totals.EXAM_TOTAL_MARKS). */
export const EXAM_SLUG_TO_MAX = {
  UNIT_TEST: 20,
  MID_SEM: 50,
  SEMESTER: 100,
}

/** @param {{ slug?: string, max_marks?: number }} et */
export function maxMarksForExamType(et) {
  if (et == null) return undefined
  if (typeof et.max_marks === 'number' && !Number.isNaN(et.max_marks)) return et.max_marks
  if (et.slug && EXAM_SLUG_TO_MAX[et.slug] != null) return EXAM_SLUG_TO_MAX[et.slug]
  return undefined
}
