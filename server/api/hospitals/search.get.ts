export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.query || query.q || '').trim()

  if (q.length < 2) {
    return { hospitals: [] }
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, city, state, beds, trauma_level, teaching_status')
    .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
    .limit(10)

  if (error) throw error

  const hospitals = (data || []).map(h => ({
    ...h,
    score: h.name?.toLowerCase().includes(q.toLowerCase()) ? 1 : 0.5,
  }))

  hospitals.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return { hospitals }
})
