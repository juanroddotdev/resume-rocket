import { matchHospitals } from '~/server/utils/hospitalMatch'
import type { HospitalSuggestion } from '~/types/hospital'

type EmployerForMatch = {
  name: string
  city?: string
  state?: string
  hospitalId?: string
  [key: string]: unknown
}

export type EmployerWithSuggestions = EmployerForMatch & {
  employer_hospital_suggestions: HospitalSuggestion[]
}

export async function attachEmployerHospitalSuggestions(
  employers: EmployerForMatch[],
): Promise<EmployerWithSuggestions[]> {
  return Promise.all(
    employers.map(async (employer) => {
      if (employer.hospitalId) {
        return { ...employer, employer_hospital_suggestions: [] }
      }

      const matches = await matchHospitals(
        {
          name: employer.name,
          city: typeof employer.city === 'string' ? employer.city : undefined,
          state: typeof employer.state === 'string' ? employer.state : undefined,
        },
        3,
      )

      const employer_hospital_suggestions: HospitalSuggestion[] = matches.map(h => ({
        id: h.id,
        name: h.name,
        city: h.city,
        state: h.state,
        beds: h.beds,
        trauma_level: h.trauma_level,
        teaching_status: h.teaching_status,
        score: h.score,
      }))

      return { ...employer, employer_hospital_suggestions }
    }),
  )
}
