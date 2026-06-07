import type { HospitalRow } from '~/types/hospital'

export type HospitalMatch = HospitalRow & { score: number }

export type HospitalMatchQuery = {
  name: string
  city?: string
  state?: string
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

function scoreHospital(
  hospital: HospitalRow,
  query: HospitalMatchQuery,
): number {
  const normalizedName = query.name.trim().toLowerCase()
  const hospitalName = hospital.name?.toLowerCase() || ''
  if (!normalizedName || !hospitalName) return 0

  let score = 0.35
  if (hospitalName === normalizedName) {
    score += 0.35
  } else if (hospitalName.includes(normalizedName) || normalizedName.includes(hospitalName)) {
    score += 0.2
  }

  const queryCity = query.city?.trim().toLowerCase()
  if (queryCity && hospital.city?.toLowerCase() === queryCity) {
    score += 0.2
  }

  const queryState = query.state?.trim().toUpperCase()
  if (queryState && hospital.state?.toUpperCase() === queryState) {
    score += 0.15
  }

  return score
}

/** Match hospitals from DB by parsed employer name/location. Service-role only. */
export async function matchHospitals(
  query: HospitalMatchQuery,
  limit = 3,
): Promise<HospitalMatch[]> {
  const name = query.name?.trim()
  if (!name || name.length < 2) return []

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, city, state, beds, trauma_level, teaching_status')
    .ilike('name', `%${escapeIlike(name)}%`)
    .limit(20)

  if (error || !data?.length) return []

  return (data as HospitalRow[])
    .map(hospital => ({
      ...hospital,
      score: scoreHospital(hospital, query),
    }))
    .filter(hospital => hospital.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** User search bar — same scoring, broader ILIKE on name and city. */
export async function searchHospitals(query: string, limit = 10): Promise<HospitalMatch[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, city, state, beds, trauma_level, teaching_status')
    .or(`name.ilike.%${escapeIlike(q)}%,city.ilike.%${escapeIlike(q)}%`)
    .limit(20)

  if (error || !data?.length) return []

  return (data as HospitalRow[])
    .map(hospital => ({
      ...hospital,
      score: scoreHospital(hospital, { name: q, city: q }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
