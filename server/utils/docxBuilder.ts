import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface DocxEmployer {
  name: string
  role?: string
  startDate?: string
  endDate?: string
  city?: string
  state?: string
  beds?: number | null
  trauma_level?: string | null
  traumaLevel?: string | null
}

export interface DocxCandidate {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  license_number?: string | null
  license_state?: string | null
  emr_system?: string | null
  specialties?: string[] | null
  employers?: DocxEmployer[] | null
  credentials?: Record<string, boolean> | null
}

function traumaLevel(employer: DocxEmployer): string {
  return employer.trauma_level || employer.traumaLevel || ''
}

function activeCertKeys(credentials: Record<string, boolean> | null | undefined): string[] {
  if (!credentials) return []
  return Object.entries(credentials)
    .filter(([, active]) => active)
    .map(([key]) => key)
}

function certStatus(
  credentials: Record<string, boolean> | null | undefined,
  key: string,
): string {
  return credentials?.[key] ? 'Current' : ''
}

function formatLicenseStateAndExpiry(
  licenseState?: string | null,
  licenseNumber?: string | null,
): string {
  const parts: string[] = []
  if (licenseState) parts.push(licenseState.toUpperCase())
  if (licenseNumber) parts.push(licenseNumber)
  return parts.join(' — ')
}

function activeLicensesList(
  licenseState?: string | null,
  licenseNumber?: string | null,
): string[] {
  const formatted = formatLicenseStateAndExpiry(licenseState, licenseNumber)
  return formatted ? [formatted] : []
}

function facilityTypesTraumaLevels(employers: DocxEmployer[]): string {
  const levels = employers
    .map(traumaLevel)
    .filter(Boolean)
    .map(level => `Level ${level} Trauma`)

  return [...new Set(levels)].join(', ')
}

function mapEmployerToExperience(employer: DocxEmployer, emrSystem: string) {
  const trauma = traumaLevel(employer)
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const dates = [employer.startDate, employer.endDate].filter(Boolean)

  return {
    experience_unit_specialty: employer.role || '',
    experience_facility_type: trauma ? `Level ${trauma} Trauma Center` : '',
    experience_hospital_name: employer.name,
    experience_facility_location: location,
    experience_employment_dates:
      dates.length === 2 ? `${dates[0]} – ${dates[1]}` : dates.join(' – '),
    experience_employment_type: '',
    experience_role_details: employer.role || '',
    experience_unit_bed_count: '',
    experience_hospital_total_beds: employer.beds != null ? String(employer.beds) : '',
    experience_trauma_level: trauma,
    experience_is_teaching_facility: '',
    experience_emr_system: emrSystem,
    experience_patient_scope: '',
    experience_floated_units_list: [] as string[],
    experience_equipment_procedures_list: [] as string[],
    experience_average_daily_patients: '',
    experience_patient_acuity_level: '',
    experience_highlights: [] as string[],
  }
}

export function mapCandidateToTemplateData(candidate: DocxCandidate) {
  const employers = candidate.employers || []
  const emrSystem = candidate.emr_system || ''
  const specialties = candidate.specialties || []
  const credentials = candidate.credentials
  const activeCerts = activeCertKeys(credentials)

  return {
    candidate_first_name: candidate.first_name || '',
    candidate_last_name: candidate.last_name || '',
    candidate_phone: candidate.phone || '',
    candidate_email: candidate.email || '',
    candidate_city: '',
    candidate_state: candidate.license_state?.toUpperCase() || '',
    active_licenses_list: activeLicensesList(candidate.license_state, candidate.license_number),

    total_years_nursing_experience: '',
    primary_specialty_unit: specialties[0] || '',
    facility_types_trauma_levels: facilityTypesTraumaLevels(employers),
    core_clinical_competencies: specialties.join(', '),
    clinical_specialties_list: specialties,
    average_patient_ratios: '',
    specialized_medical_equipment: '',
    emr_software_proficiencies: emrSystem,
    core_life_support_certifications: activeCerts.join(', '),

    rn_license_state_and_expiry: formatLicenseStateAndExpiry(
      candidate.license_state,
      candidate.license_number,
    ),
    compact_license_status: '',
    BLS_certification_expiration_date: certStatus(credentials, 'BLS'),
    ACLS_certification_expiration_date: certStatus(credentials, 'ACLS'),
    PALS_certification_expiration_date: certStatus(credentials, 'PALS'),

    education: [] as Array<{
      education_degree: string
      education_school_name: string
      education_graduation_year: string
    }>,

    professional_experiences: employers.map(e => mapEmployerToExperience(e, emrSystem)),
  }
}

export async function buildResumeDocx(candidate: DocxCandidate): Promise<Buffer> {
  const templatePath = join(process.cwd(), 'server/assets/template.docx')
  const content = await readFile(templatePath)
  const zip = new PizZip(content)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  doc.render(mapCandidateToTemplateData(candidate))

  return Buffer.from(doc.getZip().generate({ type: 'nodebuffer' }))
}
