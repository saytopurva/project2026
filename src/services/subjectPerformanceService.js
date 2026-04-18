import { djangoClient } from './djangoApi'

/**
 * GET /api/analytics/subject-performance/
 * @param {object} params
 * @param {string} params.class_name
 * @param {string} params.exam_type - UNIT_TEST | MID_SEM | SEMESTER
 * @param {string} [params.compare_class_name]
 * @param {boolean} [params.include_trend] - adds Unit Test vs Semester breakdown
 */
export async function fetchSubjectPerformance(params) {
  const q = { ...params }
  if (q.include_trend === true) q.include_trend = 'true'
  const { data } = await djangoClient.get('/api/analytics/subject-performance/', { params: q })
  return data
}
