import type { CandidateDraftInput, EducationEntry, EmployerEntry, LicenseEntry } from '../types/candidate'
import { normalizeGraduationMonth } from './educationGraduation.ts'
import { hasCompleteLicense, resolveCandidateLicenses } from './licenseRows.ts'
import { isStoredEmrComplete } from './emrSystem.ts'

export interface MissingTemplateField {
  id: string
  label: string
  step: number
}

export interface EmployerLinkAdvisory {
  id: string
  label: string
  step: number
}

type FormShape = CandidateDraftInput & {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  emr_system?: string
  employers?: EmployerEntry[]
  education?: EducationEntry[]
  licenses?: LicenseEntry[]
}

function hasText(value?: string | null) {
  return Boolean(value?.trim())
}

function employerMissing(employer: EmployerEntry, index: number): MissingTemplateField[] {
  const missing: MissingTemplateField[] = []
  const prefix = `Employer ${index + 1}`
  if (!hasText(employer.startDate)) {
    missing.push({ id: `employer-${index}-start`, label: `${prefix}: start date`, step: 2 })
  }
  if (!hasText(employer.endDate)) {
    missing.push({ id: `employer-${index}-end`, label: `${prefix}: end date`, step: 2 })
  }
  if (!hasText(employer.patientScope)) {
    missing.push({ id: `employer-${index}-scope`, label: `${prefix}: patient scope`, step: 2 })
  }
  if (!isStoredEmrComplete(employer.emrSystem)) {
    missing.push({ id: `employer-${index}-emr`, label: `${prefix}: EMR / charting system`, step: 2 })
  }
  return missing
}

export function computeMissingTemplateFields(form: FormShape): MissingTemplateField[] {
  const missing: MissingTemplateField[] = []

  if (!hasText(form.first_name)) {
    missing.push({ id: 'first_name', label: 'First name', step: 1 })
  }
  if (!hasText(form.last_name)) {
    missing.push({ id: 'last_name', label: 'Last name', step: 1 })
  }
  if (!hasText(form.email)) {
    missing.push({ id: 'email', label: 'Email', step: 1 })
  }
  if (!hasText(form.phone)) {
    missing.push({ id: 'phone', label: 'Phone', step: 1 })
  }

  if (!form.specialties?.length || !hasText(form.specialties[0])) {
    missing.push({ id: 'specialties', label: 'Primary specialty / unit', step: 2 })
  }
  if (!form.employers?.length) {
    missing.push({ id: 'employers', label: 'At least one employer / facility', step: 2 })
  } else {
    for (let i = 0; i < form.employers.length; i++) {
      missing.push(...employerMissing(form.employers[i]!, i))
    }
  }

  const licenses = resolveCandidateLicenses({
    licenses: form.licenses,
    license_state: form.license_state,
    license_number: form.license_number,
  })
  if (!hasCompleteLicense(licenses)) {
    if (!licenses.length) {
      missing.push({ id: 'licenses', label: 'At least one RN license', step: 3 })
    } else {
      licenses.forEach((row, index) => {
        if (!hasText(row.state)) {
          missing.push({ id: `license-${index}-state`, label: `License ${index + 1}: state`, step: 3 })
        }
        if (!hasText(row.number)) {
          missing.push({ id: `license-${index}-number`, label: `License ${index + 1}: license number`, step: 3 })
        }
      })
    }
  }

  const education = form.education || []
  if (!education.length) {
    missing.push({ id: 'education', label: 'At least one education entry', step: 3 })
  } else {
    education.forEach((entry, index) => {
      if (!hasText(entry.degree)) {
        missing.push({ id: `education-${index}-degree`, label: `Education ${index + 1}: degree`, step: 3 })
      }
      if (!hasText(entry.school)) {
        missing.push({ id: `education-${index}-school`, label: `Education ${index + 1}: school`, step: 3 })
      }
      if (!normalizeGraduationMonth(entry.graduationMonth)) {
        missing.push({ id: `education-${index}-month`, label: `Education ${index + 1}: graduation month`, step: 3 })
      }
      if (!hasText(entry.graduationYear)) {
        missing.push({ id: `education-${index}-year`, label: `Education ${index + 1}: graduation year`, step: 3 })
      }
    })
  }

  return missing
}

/** Non-blocking hints when parsed employers are not linked to the hospital DB. */
export function computeEmployerLinkAdvisories(form: FormShape): EmployerLinkAdvisory[] {
  const advisories: EmployerLinkAdvisory[] = []
  for (let i = 0; i < (form.employers?.length || 0); i++) {
    const employer = form.employers![i]!
    if (!employer.hospitalId) {
      advisories.push({
        id: `employer-${i}-link`,
        label: `${employer.name}: link facility for bed count & trauma (recommended)`,
        step: 2,
      })
    }
  }
  return advisories
}
