import { djangoClient } from './djangoApi'

export async function fetchTodaySchedule() {
  const { data } = await djangoClient.get('/api/schedule/today/')
  return data
}

export async function fetchWeeklySchedule() {
  const { data } = await djangoClient.get('/api/schedule/week/')
  return data
}

export async function fetchFreeSlotsToday() {
  const { data } = await djangoClient.get('/api/schedule/free-slots/')
  return data
}

export async function fetchSubstitutionsToday() {
  const { data } = await djangoClient.get('/api/substitution/')
  return data
}

export async function assignSubstitution({ substitution_id, substitute_teacher_id }) {
  const { data } = await djangoClient.post('/api/substitution/assign/', {
    substitution_id,
    substitute_teacher_id,
  })
  return data
}

