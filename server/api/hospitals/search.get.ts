import { searchHospitals } from '~/server/utils/hospitalMatch'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.query || query.q || '').trim()

  if (q.length < 2) {
    return { hospitals: [] }
  }

  const hospitals = await searchHospitals(q, 10)
  return { hospitals }
})
