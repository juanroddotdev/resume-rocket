import type { ParsedResume } from '~/types/parse'

export function parsedResumeToApiFields(parsed: ParsedResume | null) {
  if (!parsed) {
    return {
      first_name: undefined,
      last_name: undefined,
      email: undefined,
      phone: undefined,
      license_number: undefined,
      license_state: undefined,
      specialties: undefined,
      suggested_employers: [] as ParsedResume['employers'],
    }
  }

  return {
    first_name: parsed.firstName,
    last_name: parsed.lastName,
    email: parsed.email,
    phone: parsed.phone,
    license_number: parsed.licenseNumber,
    license_state: parsed.licenseState,
    specialties: parsed.specialties,
    suggested_employers: parsed.employers || [],
  }
}

export function countParsedFields(fields: ReturnType<typeof parsedResumeToApiFields>): number {
  let count = 0
  if (fields.first_name) count++
  if (fields.last_name) count++
  if (fields.email) count++
  if (fields.phone) count++
  if (fields.license_number) count++
  if (fields.license_state) count++
  if (fields.specialties?.length) count++
  if (fields.suggested_employers?.length) count++
  return count
}

export function countDetectedCredentials(credentials?: string[]): number {
  return credentials?.length ?? 0
}
