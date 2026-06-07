import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow, HospitalSuggestion } from '~/types/hospital'

type ParsedEmployerFromApi = EmployerEntry & {
  employer_hospital_suggestions?: HospitalSuggestion[]
}

/** Map parse API employer rows to wizard entries with client-only suggestions. */
export function mapParsedEmployers(employers: ParsedEmployerFromApi[]): EmployerEntry[] {
  return employers.map((employer) => {
    const { employer_hospital_suggestions, hospitalSuggestions, ...rest } = employer
    const suggestions = employer_hospital_suggestions?.length
      ? employer_hospital_suggestions
      : hospitalSuggestions

    return {
      ...rest,
      ...(suggestions?.length ? { hospitalSuggestions: suggestions } : {}),
    }
  })
}

/** Strip client-only fields before PATCH / server persistence. */
export function employersForPatch(employers: EmployerEntry[]): EmployerEntry[] {
  return employers.map(({ hospitalSuggestions, ...rest }) => rest)
}

export function normalizeEmployerKey(employer: Pick<EmployerEntry, 'name' | 'city'>) {
  return `${employer.name.trim().toLowerCase()}|${(employer.city || '').trim().toLowerCase()}`
}

export function isDuplicateEmployer(existing: EmployerEntry[], hospital: HospitalRow) {
  if (existing.some(e => e.hospitalId === hospital.id)) return true
  const key = `${hospital.name.trim().toLowerCase()}|${(hospital.city || '').trim().toLowerCase()}`
  return existing.some(e => normalizeEmployerKey(e) === key)
}

export function linkEmployerFromHospital(
  employer: EmployerEntry,
  hospital: HospitalRow | HospitalSuggestion,
): EmployerEntry {
  return {
    ...employer,
    name: hospital.name,
    city: hospital.city || undefined,
    state: hospital.state || undefined,
    hospitalId: hospital.id,
    beds: hospital.beds ?? undefined,
    traumaLevel: hospital.trauma_level ?? undefined,
    teachingStatus: hospital.teaching_status ?? undefined,
    hospitalSuggestions: undefined,
  }
}

export function unlinkEmployerFacility(employer: EmployerEntry): EmployerEntry {
  const {
    hospitalId,
    beds,
    traumaLevel,
    teachingStatus,
    hospitalSuggestions,
    ...rest
  } = employer
  return rest
}
