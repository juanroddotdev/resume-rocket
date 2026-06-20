import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CredentialsMap, EducationEntry, EmployerEntry, LicenseEntry } from '../../types/candidate'
import { normalizeCredentialExpiry } from '../../utils/credentialExpiry.ts'
import { experienceHighlightsForDocx } from '../../utils/employerClinicalFlags.ts'
import { normalizeEmploymentType } from '../../utils/employmentType.ts'
import { employerEmrProficienciesUnion } from '../../utils/emrSystem.ts'
import { formatEducationGraduationForDocx } from '../../utils/educationGraduation.ts'
import {
  activeLicensesListForDocx,
  formatLicenseRowForDocx,
  primaryLicense,
  resolveCandidateLicenses,
} from '../../utils/licenseRows.ts'
import { orderedActiveCertificationKeys } from '../../utils/certificationOptions.ts'
import { activeCredentialKeys } from './normalizeCandidate.ts'

interface DocxEmployer extends EmployerEntry {}

export interface DocxCandidate {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  home_address?: string | null
  home_city?: string | null
  home_state?: string | null
  license_number?: string | null
  license_state?: string | null
  emr_system?: string | null
  specialties?: string[] | null
  employers?: DocxEmployer[] | null
  credentials?: CredentialsMap | null
  education?: EducationEntry[] | null
  licenses?: LicenseEntry[] | null
  years_nursing_experience?: string | null
  compact_license_status?: string | null
  average_patient_ratios?: string | null
  specialized_medical_equipment?: string | null
}

/** Coerce template scalars so docxtemplater never renders the literal "undefined". */
function docxText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function docxStringList(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items.map(item => docxText(item)).filter(item => item.length > 0)
}

/** Recursively replace null/undefined leaves with empty strings for DOCX render. */
export function sanitizeDocxTemplateData(value: unknown): unknown {
  if (value == null) return ''
  if (Array.isArray(value)) {
    if (value.length === 0) return []
    if (typeof value[0] === 'object' && value[0] !== null) {
      return value.map(item => sanitizeDocxTemplateData(item))
    }
    return docxStringList(value)
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      out[key] = sanitizeDocxTemplateData(nested)
    }
    return out
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
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
  expiry?: string | null,
): string {
  const parts: string[] = []
  if (licenseState) parts.push(licenseState.toUpperCase())
  if (licenseNumber) parts.push(licenseNumber)
  if (expiry?.trim()) parts.push(expiry.trim())
  return parts.join(' · ')
}

function activeLicensesList(
  licenses: LicenseEntry[],
  licenseState?: string | null,
  licenseNumber?: string | null,
): string[] {
  const fromRows = activeLicensesListForDocx(licenses)
  if (fromRows.length) return fromRows
  const formatted = formatLicenseStateAndExpiry(licenseState, licenseNumber)
  return formatted ? [formatted] : []
}

function facilityTypesTraumaLevels(_employers: DocxEmployer[]): string {
  return ''
}

function roleDetailsForDocx(role: string | undefined, unitSpecialty: string): string {
  const roleText = (role || '').trim()
  const unitText = unitSpecialty.trim()
  if (!roleText) return ''
  if (!unitText) return roleText
  if (roleText.toLowerCase() === unitText.toLowerCase()) return ''
  if (roleText.toLowerCase().includes(unitText.toLowerCase())) return ''
  if (unitText.toLowerCase().includes(roleText.toLowerCase())) return ''
  return roleText
}

function resolveCandidateLocation(candidate: DocxCandidate) {
  const homeCity = candidate.home_city?.trim() || ''
  const homeState = candidate.home_state?.trim().toUpperCase() || ''
  if (homeCity || homeState) {
    return { city: homeCity, state: homeState }
  }
  return { city: '', state: '' }
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

function formatEmploymentTypeForDocx(employer: DocxEmployer): string {
  const type = normalizeEmploymentType(employer.employmentType) || employer.employmentType || ''
  const schedule = employer.prnSchedule?.trim()
  if (type === 'PRN' && schedule) return `${type} — ${schedule}`
  return type
}

function mapEmployerToExperience(
  employer: DocxEmployer,
  primarySpecialty: string,
  legacyEmrSystem: string,
) {
  const trauma = traumaLevel(employer)
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const dates = [employer.startDate, employer.endDate].filter(Boolean)
  const unitSpecialty = employer.role?.trim() || primarySpecialty

  return {
    experience_unit_specialty: unitSpecialty,
    experience_facility_type: '',
    experience_hospital_name: docxText(employer.name),
    experience_facility_location: location,
    experience_employment_dates:
      dates.length === 2 ? `${dates[0]} – ${dates[1]}` : dates.join(' – '),
    experience_employment_type: formatEmploymentTypeForDocx(employer),
    experience_role_details: roleDetailsForDocx(employer.role, unitSpecialty),
    experience_unit_bed_count: employer.unitBedCount || '',
    experience_hospital_total_beds: employer.beds != null ? String(employer.beds) : '',
    experience_trauma_level: trauma,
    experience_is_teaching_facility: teachingFacilityLabel(employer),
    experience_emr_system: employer.emrSystem || legacyEmrSystem || '',
    experience_patient_scope: employer.patientScope || '',
    experience_floated_units_list: docxStringList(employer.floatedUnits),
    experience_equipment_procedures_list: docxStringList(employer.equipmentProcedures),
    experience_average_daily_patients: employer.avgDailyPatients || '',
    experience_patient_acuity_level: docxText(employer.patientAcuity),
    experience_highlights: docxStringList(experienceHighlightsForDocx(employer)),
  }
}

function mapCertificationsForDocx(credentials: CredentialsMap | null | undefined) {
  const keys = orderedActiveCertificationKeys(activeCredentialKeys(credentials))
  return keys.map(key => ({
    certification_name: key,
    certification_expiration_date: certExpiry(credentials, key) || 'Current',
  }))
}

export function mapCandidateToTemplateData(candidate: DocxCandidate) {
  const employers = candidate.employers || []
  const emrUnion = employerEmrProficienciesUnion(employers)
  const emrProficiencies = emrUnion || candidate.emr_system || ''
  const licenses = resolveCandidateLicenses({
    licenses: candidate.licenses,
    license_state: candidate.license_state,
    license_number: candidate.license_number,
  })
  const primary = primaryLicense(licenses)
  const licenseState = primary?.state || candidate.license_state
  const licenseNumber = primary?.number || candidate.license_number
  const licenseExpiry = primary?.expiry
  const specialties = candidate.specialties || []
  const credentials = candidate.credentials
  const activeCerts = orderedActiveCertificationKeys(activeCertKeys(credentials))
  const primarySpecialty = specialties[0] || ''
  const { city: homeCity, state: homeState } = resolveCandidateLocation(candidate)

  return sanitizeDocxTemplateData({
    candidate_first_name: candidate.first_name || '',
    candidate_last_name: candidate.last_name || '',
    candidate_phone: candidate.phone || '',
    candidate_email: candidate.email || '',
    candidate_home_address: candidate.home_address || '',
    candidate_city: homeCity,
    candidate_state: licenseState?.toUpperCase() || homeState,
    active_licenses_list: activeLicensesList(licenses, candidate.license_state, candidate.license_number),

    total_years_nursing_experience: candidate.years_nursing_experience || '',
    primary_specialty_unit: primarySpecialty,
    facility_types_trauma_levels: facilityTypesTraumaLevels(employers),
    core_clinical_competencies: specialties.join(', '),
    clinical_specialties_list: specialties,
    average_patient_ratios: '',
    specialized_medical_equipment: candidate.specialized_medical_equipment || '',
    emr_software_proficiencies: emrProficiencies,
    core_life_support_certifications: activeCerts.join(', '),
    certifications_list: mapCertificationsForDocx(credentials),

    rn_license_state_and_expiry: primary
      ? formatLicenseRowForDocx(primary)
      : formatLicenseStateAndExpiry(licenseState, licenseNumber, licenseExpiry),
    compact_license_status: candidate.compact_license_status || '',
    BLS_certification_expiration_date: certExpiry(credentials, 'BLS'),
    ACLS_certification_expiration_date: certExpiry(credentials, 'ACLS'),
    PALS_certification_expiration_date: certExpiry(credentials, 'PALS'),

    education: mapEducation(candidate.education),

    professional_experiences: employers.map(e =>
      mapEmployerToExperience(e, primarySpecialty, candidate.emr_system || ''),
    ),
  })
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
