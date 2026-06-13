import type {
  CandidateDraftInput,
  CredentialsMap,
  CredentialEntry,
  EducationEntry,
  EmployerEntry,
  LicenseEntry,
} from '../types/candidate'
import type { HospitalSuggestion } from '../types/hospital'
import { employersForPatch, mapParsedEmployers } from './employerLink.ts'
import { displayCredentialExpiry } from './credentialExpiry.ts'
import { backfillEmployerEmrSystems, employerEmrProficienciesUnion } from './emrSystem.ts'
import { legacyScalarsFromLicenses, resolveCandidateLicenses } from './licenseRows.ts'

export type AdminSectionId = 'resume' | 'identity' | 'employment' | 'credentials' | 'review'

export const ADMIN_SECTIONS: Array<{ id: AdminSectionId; label: string }> = [
  { id: 'resume', label: 'Resume' },
  { id: 'identity', label: 'Identity' },
  { id: 'employment', label: 'Employment' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'review', label: 'Review' },
]

export function adminSectionForStep(step: number): AdminSectionId {
  if (step === 0) return 'resume'
  if (step === 1) return 'identity'
  if (step === 2) return 'employment'
  if (step === 3) return 'credentials'
  return 'review'
}

function normalizeStoredCredentials(raw: unknown): CredentialsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: CredentialsMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) {
      out[key.toUpperCase()] = { active: true }
    } else if (value && typeof value === 'object' && 'active' in (value as CredentialEntry)) {
      const entry = value as CredentialEntry
      out[key.toUpperCase()] = entry.active || entry.expiry
        ? { active: entry.active ?? true, expiry: displayCredentialExpiry(entry.expiry) || undefined }
        : { active: true }
    }
  }
  return out
}

export function defaultCandidateForm() {
  return {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    license_state: '',
    licenses: [] as LicenseEntry[],
    emr_system: '',
    employers: [] as EmployerEntry[],
    credentials: {} as CredentialsMap,
    specialties: [] as string[],
    years_nursing_experience: '',
    compact_license_status: '',
    average_patient_ratios: '',
    specialized_medical_equipment: '',
    education: [] as EducationEntry[],
  }
}

function stripEmployerSuggestions(employers: EmployerEntry[]): EmployerEntry[] {
  return employers.map(({ hospitalSuggestions: _s, ...rest }) => rest)
}

export function candidateFormSnapshot(form: ReturnType<typeof defaultCandidateForm>): CandidateDraftInput {
  const employers = employersForPatch(form.employers)
  const emrUnion = employerEmrProficienciesUnion(employers)
  const licenses = form.licenses.length
    ? form.licenses
    : resolveCandidateLicenses({
      licenses: form.licenses,
      license_state: form.license_state,
      license_number: form.license_number,
    })
  const legacyScalars = legacyScalarsFromLicenses(licenses)
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email,
    phone: form.phone,
    license_number: legacyScalars.license_number ?? form.license_number,
    license_state: legacyScalars.license_state ?? form.license_state,
    licenses: licenses.length ? licenses : undefined,
    emr_system: emrUnion || undefined,
    employers,
    credentials: form.credentials,
    specialties: form.specialties,
    years_nursing_experience: form.years_nursing_experience || undefined,
    compact_license_status: form.compact_license_status || undefined,
    average_patient_ratios: form.average_patient_ratios || undefined,
    specialized_medical_equipment: form.specialized_medical_equipment || undefined,
    education: form.education.length ? form.education : undefined,
  }
}

export type AdminDraftResponse = {
  id: string
  status: string
  updated_at?: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  license_number?: string | null
  license_state?: string | null
  licenses?: LicenseEntry[] | null
  emr_system?: string | null
  specialties?: string[] | null
  credentials?: CredentialsMap | null
  employers?: EmployerEntry[] | null
  education?: EducationEntry[] | null
  years_nursing_experience?: string | null
  compact_license_status?: string | null
  average_patient_ratios?: string | null
  specialized_medical_equipment?: string | null
  resume_storage_path?: string | null
  resume_original_filename?: string | null
  parse_error?: string | null
}

export function applyAdminDraftToForm(
  form: ReturnType<typeof defaultCandidateForm>,
  row: AdminDraftResponse,
) {
  const employers = backfillEmployerEmrSystems(stripEmployerSuggestions(row.employers ?? []), row.emr_system)
  const licenses = resolveCandidateLicenses({
    licenses: row.licenses,
    license_state: row.license_state,
    license_number: row.license_number,
  })
  const legacyScalars = legacyScalarsFromLicenses(licenses)
  Object.assign(form, {
    ...defaultCandidateForm(),
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    license_number: legacyScalars.license_number ?? row.license_number ?? '',
    license_state: legacyScalars.license_state ?? row.license_state ?? '',
    licenses,
    emr_system: employerEmrProficienciesUnion(employers) || row.emr_system || '',
    employers,
    credentials: normalizeStoredCredentials(row.credentials ?? {}),
    specialties: row.specialties ?? [],
    years_nursing_experience: row.years_nursing_experience ?? '',
    compact_license_status: row.compact_license_status ?? '',
    average_patient_ratios: row.average_patient_ratios ?? '',
    specialized_medical_equipment: row.specialized_medical_equipment ?? '',
    education: row.education ?? [],
  })
}

export function applyParseResultToForm(
  form: ReturnType<typeof defaultCandidateForm>,
  data: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    license_number?: string
    license_state?: string
    licenses?: LicenseEntry[]
    emr_system?: string
    specialties?: string[]
    years_nursing_experience?: string
    compact_license_status?: string
    average_patient_ratios?: string
    specialized_medical_equipment?: string
    education?: EducationEntry[]
    suggested_employers?: Array<EmployerEntry & { employer_hospital_suggestions?: HospitalSuggestion[] }>
    detected_credentials?: string[]
    credentials?: CredentialsMap
  },
) {
  if (data.first_name) form.first_name = data.first_name
  if (data.last_name) form.last_name = data.last_name
  if (data.email) form.email = data.email
  if (data.phone) form.phone = data.phone
  if (data.license_number || data.license_state) {
    form.licenses = resolveCandidateLicenses({
      licenses: data.licenses,
      license_state: data.license_state,
      license_number: data.license_number,
    })
    const legacyScalars = legacyScalarsFromLicenses(form.licenses)
    form.license_number = legacyScalars.license_number ?? data.license_number ?? form.license_number
    form.license_state = legacyScalars.license_state ?? data.license_state ?? form.license_state
  } else if (data.licenses?.length) {
    form.licenses = [...data.licenses]
    Object.assign(form, legacyScalarsFromLicenses(form.licenses))
  }
  if (data.emr_system) form.emr_system = data.emr_system
  if (data.specialties?.length) form.specialties = data.specialties
  if (data.years_nursing_experience) form.years_nursing_experience = data.years_nursing_experience
  if (data.compact_license_status) form.compact_license_status = data.compact_license_status
  if (data.average_patient_ratios) form.average_patient_ratios = data.average_patient_ratios
  if (data.specialized_medical_equipment) {
    form.specialized_medical_equipment = data.specialized_medical_equipment
  }
  if (data.education?.length) form.education = [...data.education]
  if (data.suggested_employers?.length) {
    form.employers = mapParsedEmployers(data.suggested_employers)
  }
  if (data.credentials && Object.keys(data.credentials).length) {
    form.credentials = normalizeStoredCredentials(data.credentials)
  } else if (data.detected_credentials?.length) {
    for (const cert of data.detected_credentials) {
      form.credentials[cert.toUpperCase()] = { active: true }
    }
  }
}
