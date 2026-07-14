import {
  normalizeCredentials,
  normalizeEducation,
  normalizeEmployers,
} from '~/server/utils/normalizeCandidate'
import { resolveCandidateLicenses } from '~/utils/licenseRows'
import { normalizeProfessionalSnapshot } from '~/utils/professionalSnapshot'

export const CANDIDATE_DRAFT_SELECT = [
  'id',
  'status',
  'updated_at',
  'first_name',
  'last_name',
  'email',
  'phone',
  'license_number',
  'license_state',
  'licenses',
  'specialties',
  'credentials',
  'employers',
  'education',
  'years_nursing_experience',
  'compact_license_status',
  'average_patient_ratios',
  'specialized_medical_equipment',
  'professional_snapshot',
  'home_address',
  'home_city',
  'home_state',
  'emr_system',
  'resume_storage_path',
  'resume_original_filename',
  'parse_error',
].join(', ')

export function buildCandidateDraftResponse(row: Record<string, unknown>) {
  if (row.status === 'submitted' || row.status === 'confirmed') {
    return {
      id: row.id,
      status: row.status,
    }
  }

  return {
    id: row.id,
    status: row.status,
    updated_at: row.updated_at,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    license_number: row.license_number,
    license_state: row.license_state,
    licenses: resolveCandidateLicenses({
      licenses: row.licenses,
      license_state: row.license_state as string | null | undefined,
      license_number: row.license_number as string | null | undefined,
    }),
    emr_system: row.emr_system,
    specialties: row.specialties,
    credentials: row.credentials ? normalizeCredentials(row.credentials) : null,
    employers: row.employers ? normalizeEmployers(row.employers) : null,
    education: row.education ? normalizeEducation(row.education) : null,
    years_nursing_experience: row.years_nursing_experience,
    compact_license_status: row.compact_license_status,
    average_patient_ratios: row.average_patient_ratios,
    specialized_medical_equipment: row.specialized_medical_equipment,
    professional_snapshot: row.professional_snapshot
      ? normalizeProfessionalSnapshot(row.professional_snapshot)
      : null,
    home_address: row.home_address,
    home_city: row.home_city,
    home_state: row.home_state,
    resume_storage_path: row.resume_storage_path,
    resume_original_filename: row.resume_original_filename,
    parse_error: row.parse_error,
  }
}
