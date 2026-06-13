import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CredentialsMap, EducationEntry, EmployerEntry } from '../../types/candidate'
import { normalizeCredentialExpiry } from '../../utils/credentialExpiry.ts'
import { experienceHighlightsForDocx } from '../../utils/employerClinicalFlags.ts'
import { employerEmrProficienciesUnion } from '../../utils/emrSystem.ts'
import { formatEducationGraduationForDocx } from '../../utils/educationGraduation.ts'
import { activeCredentialKeys } from './normalizeCandidate.ts'

interface DocxEmployer extends EmployerEntry {}

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
  credentials?: CredentialsMap | null
  education?: EducationEntry[] | null
  years_nursing_experience?: string | null
  compact_license_status?: string | null
  average_patient_ratios?: string | null
  specialized_medical_equipment?: string | null
}

function traumaLevel(employer: DocxEmployer): string {
  return employer.traumaLevel || ''
}

function activeCertKeys(credentials: CredentialsMap | null | undefined): string[] {
  return activeCredentialKeys(credentials)
}

function certExpiry(
  credentials: CredentialsMap | null | undefined,
  key: string,
): string {
  if (!credentials) return ''
  const entry = credentials[key.toUpperCase()] ?? credentials[key]
  if (entry && typeof entry === 'object' && entry.expiry) {
    return normalizeCredentialExpiry(entry.expiry) ?? entry.expiry
  }
  return ''
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

function primaryEmployerLocation(employers: DocxEmployer[]) {
  const first = employers[0]
  return {
    city: first?.city?.trim() || '',
    state: first?.state?.trim().toUpperCase() || '',
  }
}

function teachingFacilityLabel(employer: DocxEmployer): string {
  if (employer.teachingStatus === true) return 'Yes'
  if (employer.teachingStatus === false) return 'No'
  return ''
}

function mapEducation(education: EducationEntry[] | null | undefined) {
  return (education || []).map(entry => ({
    education_degree: entry.degree || '',
    education_school_name: entry.school || '',
    education_graduation_year: formatEducationGraduationForDocx(entry),
  }))
}

function mapEmployerToExperience(
  employer: DocxEmployer,
  primarySpecialty: string,
  legacyEmrSystem: string,
) {
  const trauma = traumaLevel(employer)
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const dates = [employer.startDate, employer.endDate].filter(Boolean)

  return {
    experience_unit_specialty: employer.role || primarySpecialty,
    experience_facility_type: trauma ? `Level ${trauma} Trauma Center` : '',
    experience_hospital_name: employer.name,
    experience_facility_location: location,
    experience_employment_dates:
      dates.length === 2 ? `${dates[0]} – ${dates[1]}` : dates.join(' – '),
    experience_employment_type: employer.employmentType || '',
    experience_role_details: employer.role || '',
    experience_unit_bed_count: employer.unitBedCount || '',
    experience_hospital_total_beds: employer.beds != null ? String(employer.beds) : '',
    experience_trauma_level: trauma,
    experience_is_teaching_facility: teachingFacilityLabel(employer),
    experience_emr_system: employer.emrSystem || legacyEmrSystem || '',
    experience_patient_scope: employer.patientScope || '',
    experience_floated_units_list: employer.floatedUnits || [],
    experience_equipment_procedures_list: employer.equipmentProcedures || [],
    experience_average_daily_patients: employer.avgDailyPatients || '',
    experience_patient_acuity_level: employer.patientAcuity || '',
    experience_highlights: experienceHighlightsForDocx(employer),
  }
}

export function mapCandidateToTemplateData(candidate: DocxCandidate) {
  const employers = candidate.employers || []
  const emrUnion = employerEmrProficienciesUnion(employers)
  const emrProficiencies = emrUnion || candidate.emr_system || ''
  const specialties = candidate.specialties || []
  const credentials = candidate.credentials
  const activeCerts = activeCertKeys(credentials)
  const primarySpecialty = specialties[0] || ''
  const { city: employerCity, state: employerState } = primaryEmployerLocation(employers)

  return {
    candidate_first_name: candidate.first_name || '',
    candidate_last_name: candidate.last_name || '',
    candidate_phone: candidate.phone || '',
    candidate_email: candidate.email || '',
    candidate_city: employerCity,
    candidate_state: candidate.license_state?.toUpperCase() || employerState,
    active_licenses_list: activeLicensesList(candidate.license_state, candidate.license_number),

    total_years_nursing_experience: candidate.years_nursing_experience || '',
    primary_specialty_unit: primarySpecialty,
    facility_types_trauma_levels: facilityTypesTraumaLevels(employers),
    core_clinical_competencies: specialties.join(', '),
    clinical_specialties_list: specialties,
    average_patient_ratios: candidate.average_patient_ratios || '',
    specialized_medical_equipment: candidate.specialized_medical_equipment || '',
    emr_software_proficiencies: emrProficiencies,
    core_life_support_certifications: activeCerts.join(', '),

    rn_license_state_and_expiry: formatLicenseStateAndExpiry(
      candidate.license_state,
      candidate.license_number,
    ),
    compact_license_status: candidate.compact_license_status || '',
    BLS_certification_expiration_date: certExpiry(credentials, 'BLS'),
    ACLS_certification_expiration_date: certExpiry(credentials, 'ACLS'),
    PALS_certification_expiration_date: certExpiry(credentials, 'PALS'),

    education: mapEducation(candidate.education),

    professional_experiences: employers.map(e =>
      mapEmployerToExperience(e, primarySpecialty, candidate.emr_system || ''),
    ),
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
