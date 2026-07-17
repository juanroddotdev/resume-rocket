import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CredentialsMap, EducationEntry, EmployerEntry, LicenseEntry } from '../../types/candidate'
import { normalizeCredentialExpiry } from '../../utils/credentialExpiry.ts'
import { experienceHighlightsForDocx } from '../../utils/employerClinicalFlags.ts'
import { normalizeEmploymentType } from '../../utils/employmentType.ts'
import { employerEmrProficienciesUnion } from '../../utils/emrSystem.ts'
import {
  employerMetricsLineFields,
  formatEmployerMetricsLine,
} from '../../utils/employerMetricsLine.ts'
import { formatEducationGraduationForDocx } from '../../utils/educationGraduation.ts'
import {
  activeLicensesListForDocx,
  formatLicenseRowForDocx,
  primaryLicense,
  resolveCandidateLicenses,
} from '../../utils/licenseRows.ts'
import { orderedActiveCertificationKeys } from '../../utils/certificationOptions.ts'
import { activeCredentialKeys } from './normalizeCandidate.ts'
import type { ProfessionalSnapshot } from '../../utils/professionalSnapshot.ts'
import {
  professionalSnapshotToLines,
  resolveProfessionalSnapshotForDocx,
} from '../../utils/professionalSnapshot.ts'

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
  professional_snapshot?: ProfessionalSnapshot | null
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
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const dates = [employer.startDate, employer.endDate].filter(Boolean)
  const unitSpecialty = employer.role?.trim() || primarySpecialty
  const metrics = employerMetricsLineFields(employer, { legacyEmrSystem })

  const metricsLine = formatEmployerMetricsLine(employer, { legacyEmrSystem })

  return {
    experience_unit_specialty: unitSpecialty,
    experience_facility_type: '',
    experience_hospital_name: docxText(employer.name),
    experience_facility_location: location,
    experience_employment_dates:
      dates.length === 2 ? `${dates[0]} – ${dates[1]}` : dates.join(' – '),
    experience_employment_type: formatEmploymentTypeForDocx(employer),
    experience_role_details: roleDetailsForDocx(employer.role, unitSpecialty),
    /** Joined labeled metrics (omits empties — avoids orphan ` • ` in DOCX). */
    experience_metrics_line: metricsLine,
    /** 0–1 row loop so the metrics paragraph is omitted when the line is empty. */
    experience_metrics_rows: metricsLine.trim()
      ? [{ experience_metrics_line: metricsLine }]
      : [],
    experience_unit_bed_count: metrics.unitBedCount,
    experience_hospital_total_beds: metrics.hospitalBeds,
    experience_trauma_level: metrics.traumaLevel,
    experience_is_teaching_facility: metrics.teachingFacility,
    experience_emr_system: metrics.emrSystem,
    experience_patient_scope: metrics.patientScope,
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

function mapLicensesForDocx(licenses: LicenseEntry[]) {
  return licenses
    .map(row => ({
      rn_license_state_and_expiry: formatLicenseRowForDocx(row),
    }))
    .filter(row => row.rn_license_state_and_expiry.length > 0)
}

/** Professional Snapshot — only included lines (no empty bullet placeholders). */
function mapProfessionalSnapshot(candidate: DocxCandidate): {
  snapshot_lines: Array<{ snapshot_line: string }>
} {
  const snapshot = resolveProfessionalSnapshotForDocx({
    specialties: candidate.specialties,
    years_nursing_experience: candidate.years_nursing_experience,
    average_patient_ratios: candidate.average_patient_ratios,
    specialized_medical_equipment: candidate.specialized_medical_equipment,
    emr_system: candidate.emr_system,
    employers: candidate.employers,
    professional_snapshot: candidate.professional_snapshot,
  })
  return { snapshot_lines: professionalSnapshotToLines(snapshot) }
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

    licenses_list: mapLicensesForDocx(licenses),

    compact_license_status: candidate.compact_license_status || '',
    BLS_certification_expiration_date: certExpiry(credentials, 'BLS'),
    ACLS_certification_expiration_date: certExpiry(credentials, 'ACLS'),
    PALS_certification_expiration_date: certExpiry(credentials, 'PALS'),

    education: mapEducation(candidate.education),

    ...mapProfessionalSnapshot(candidate),

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
