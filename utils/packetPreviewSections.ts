import type {
  CandidateDraftInput,
  CredentialEntry,
  CredentialsMap,
  EducationEntry,
  EmployerEntry,
} from '../types/candidate'
import { displayCredentialExpiry } from './credentialExpiry.ts'
import { experienceHighlightsForDocx } from './employerClinicalFlags.ts'
import { normalizeEmploymentType } from './employmentType.ts'
import { emrSystemFromFields, resolveEmrFields } from './emrSystem.ts'
import { formatEducationGraduationForDocx } from './educationGraduation.ts'
import {
  activeLicensesListForDocx,
  resolveCandidateLicenses,
} from './licenseRows.ts'

const EMPTY = '—'

export interface PacketPreviewField {
  label: string
  value: string
}

export interface PacketPreviewEmployer {
  title: string
  fields: PacketPreviewField[]
  highlights: string[]
}

export interface PacketPreviewEducation {
  degree: string
  school: string
  graduation: string
}

export interface PacketPreviewCertification {
  name: string
  expiry: string
}

export interface PacketPreviewSections {
  identity: PacketPreviewField[]
  licenses: string[]
  compactLicenseStatus: string
  clinical: PacketPreviewField[]
  certifications: PacketPreviewCertification[]
  education: PacketPreviewEducation[]
  employers: PacketPreviewEmployer[]
}

function display(value?: string | null): string {
  const trimmed = value?.trim()
  return trimmed || EMPTY
}

function formatEmploymentType(employer: EmployerEntry): string {
  const type = normalizeEmploymentType(employer.employmentType) || employer.employmentType?.trim() || ''
  const schedule = employer.prnSchedule?.trim()
  if (type === 'PRN' && schedule) return `${type} — ${schedule}`
  return type || EMPTY
}

function formatEmrDisplay(emrSystem?: string | null): string {
  const { selection, custom } = resolveEmrFields(emrSystem)
  if (!selection) return EMPTY
  return emrSystemFromFields(selection, custom) || EMPTY
}

function teachingLabel(value?: boolean | null): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return EMPTY
}

function activeCertifications(credentials?: CredentialsMap | Record<string, boolean> | null): PacketPreviewCertification[] {
  if (!credentials) return []
  return Object.entries(credentials)
    .filter(([, entry]) => {
      if (typeof entry === 'boolean') return entry
      return (entry as CredentialEntry)?.active === true
    })
    .map(([name, entry]) => {
      const expiry = typeof entry === 'object' && entry && 'expiry' in entry
        ? displayCredentialExpiry(entry.expiry)
        : ''
      return {
        name: name.toUpperCase(),
        expiry: expiry || EMPTY,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function mapEmployer(employer: EmployerEntry, index: number): PacketPreviewEmployer {
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const dates = [employer.startDate, employer.endDate].filter(Boolean)
  const dateRange = dates.length === 2
    ? `${dates[0]} – ${dates[1]}`
    : dates.join(' – ') || EMPTY

  const fields: PacketPreviewField[] = [
    { label: 'Facility', value: display(employer.name) },
    { label: 'Location', value: location || EMPTY },
    { label: 'Role / unit', value: display(employer.role) },
    { label: 'Dates', value: dateRange },
    { label: 'Employment type', value: formatEmploymentType(employer) },
    { label: 'EMR platform', value: formatEmrDisplay(employer.emrSystem) },
    { label: 'Patient scope', value: display(employer.patientScope) },
    { label: 'Patient acuity', value: display(employer.patientAcuity) },
  ]

  if (employer.hospitalId || employer.beds != null) {
    fields.push({
      label: 'Hospital beds',
      value: employer.beds != null ? String(employer.beds) : EMPTY,
    })
  }
  if (employer.traumaLevel?.trim()) {
    fields.push({ label: 'Trauma level', value: `Level ${employer.traumaLevel.trim()}` })
  }
  if (employer.teachingStatus != null) {
    fields.push({ label: 'Teaching facility', value: teachingLabel(employer.teachingStatus) })
  }
  if (employer.unitBedCount?.trim()) {
    fields.push({ label: 'Unit beds', value: employer.unitBedCount.trim() })
  }
  if (employer.avgDailyPatients?.trim()) {
    fields.push({ label: 'Avg daily patients', value: employer.avgDailyPatients.trim() })
  }

  const highlights = experienceHighlightsForDocx(employer).filter(h => h.trim())

  return {
    title: employer.name?.trim() || `Employer ${index + 1}`,
    fields,
    highlights,
  }
}

function mapEducation(entry: EducationEntry): PacketPreviewEducation {
  return {
    degree: display(entry.degree),
    school: display(entry.school),
    graduation: formatEducationGraduationForDocx(entry) || EMPTY,
  }
}

/** Build read-only HTML preview sections from wizard draft input. */
export function buildPacketPreviewSections(form: CandidateDraftInput): PacketPreviewSections {
  const licenses = resolveCandidateLicenses({
    licenses: form.licenses,
    license_state: form.license_state,
    license_number: form.license_number,
  })
  const licenseLines = activeLicensesListForDocx(licenses)
  const specialties = (form.specialties || []).filter(s => s.trim())

  return {
    identity: [
      { label: 'Name', value: display([form.first_name, form.last_name].filter(Boolean).join(' ')) },
      { label: 'Email', value: display(form.email) },
      { label: 'Phone', value: display(form.phone) },
    ],
    licenses: licenseLines.length ? licenseLines : [EMPTY],
    compactLicenseStatus: display(form.compact_license_status),
    clinical: [
      { label: 'Specialties / units', value: specialties.length ? specialties.join(', ') : EMPTY },
      { label: 'Years of nursing experience', value: display(form.years_nursing_experience) },
      { label: 'Average patient ratios', value: display(form.average_patient_ratios) },
      { label: 'Specialized medical equipment', value: display(form.specialized_medical_equipment) },
    ],
    certifications: activeCertifications(form.credentials),
    education: (form.education || []).map(mapEducation),
    employers: (form.employers || []).map(mapEmployer),
  }
}
