import type { ParsedResume } from '~/types/parse'
import { normalizeCredentialExpiry } from '../../utils/credentialExpiry.ts'

export function parsedResumeToApiFields(parsed: ParsedResume | null) {
  if (!parsed) {
    return {
      first_name: undefined,
      last_name: undefined,
      email: undefined,
      phone: undefined,
      license_number: undefined,
      license_state: undefined,
      licenses: undefined,
      specialties: undefined,
      years_nursing_experience: undefined,
      compact_license_status: undefined,
      average_patient_ratios: undefined,
      specialized_medical_equipment: undefined,
      education: undefined,
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
    licenses: parsed.licenses,
    specialties: parsed.specialties,
    years_nursing_experience: parsed.yearsNursingExperience,
    compact_license_status: parsed.compactLicenseStatus,
    average_patient_ratios: parsed.averagePatientRatios,
    specialized_medical_equipment: parsed.specializedMedicalEquipment,
    education: parsed.education,
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
  if (fields.licenses?.length) count++
  if (fields.specialties?.length) count++
  if (fields.years_nursing_experience) count++
  if (fields.compact_license_status) count++
  if (fields.average_patient_ratios) count++
  if (fields.specialized_medical_equipment) count++
  if (fields.education?.length) count++
  if (fields.suggested_employers?.length) count++
  return count
}

export function countDetectedCredentials(credentials?: string[]): number {
  return credentials?.length ?? 0
}

/** Build credential ingress for normalizeCredentials from parse heuristics + Gemini details. */
export function credentialsInputFromParsed(parsed: ParsedResume | null) {
  if (!parsed) return null

  const acc: Record<string, boolean | { active: boolean, expiry?: string }> = {}

  for (const cert of parsed.detectedCredentials || []) {
    acc[cert.toUpperCase()] = true
  }

  for (const cert of parsed.certificationDetails || []) {
    const key = cert.name.toUpperCase()
    const expiry = cert.expiry ? normalizeCredentialExpiry(cert.expiry) : undefined
    acc[key] = expiry ? { active: true, expiry } : { active: true }
  }

  return Object.keys(acc).length ? acc : null
}
