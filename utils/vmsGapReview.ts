import type { CandidateDraftInput, EducationEntry, EmployerEntry, LicenseEntry } from '~/types/candidate'
import { normalizeGraduationMonth } from '~/utils/educationGraduation'
import { hasCompleteLicense, resolveCandidateLicenses } from '~/utils/licenseRows'
import { isStoredEmrComplete } from '~/utils/emrSystem'
import { normalizeEmploymentType } from '~/utils/employmentType'

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
  if (!hasText(employer.role)) {
    missing.push({ id: `employer-${index}-role`, label: `${prefix}: role / unit`, step: 2 })
  }
  if (!hasText(employer.startDate)) {
    missing.push({ id: `employer-${index}-start`, label: `${prefix}: start date`, step: 2 })
  }
  if (!hasText(employer.endDate)) {
    missing.push({ id: `employer-${index}-end`, label: `${prefix}: end date`, step: 2 })
  }
  if (!hasText(employer.employmentType)) {
    missing.push({ id: `employer-${index}-type`, label: `${prefix}: employment type`, step: 2 })
  }
  if (!hasText(employer.patientScope)) {
    missing.push({ id: `employer-${index}-scope`, label: `${prefix}: patient scope`, step: 2 })
  }
  if (!hasText(employer.patientAcuity)) {
    missing.push({ id: `employer-${index}-acuity`, label: `${prefix}: patient acuity`, step: 2 })
  }
  if (!employer.highlights?.length || !employer.highlights.some(h => h.trim())) {
    missing.push({ id: `employer-${index}-highlights`, label: `${prefix}: at least one highlight`, step: 2 })
  }
  if (!isStoredEmrComplete(employer.emrSystem)) {
    missing.push({ id: `employer-${index}-emr`, label: `${prefix}: EMR platform`, step: 2 })
  }
  if (normalizeEmploymentType(employer.employmentType) === 'PRN' && !hasText(employer.prnSchedule)) {
    missing.push({ id: `employer-${index}-prn-schedule`, label: `${prefix}: typical PRN schedule`, step: 2 })
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

  if (!hasText(form.years_nursing_experience)) {
    missing.push({ id: 'years_nursing_experience', label: 'Years of nursing experience', step: 3 })
  }
  if (!hasText(form.compact_license_status)) {
    missing.push({ id: 'compact_license_status', label: 'Compact license status', step: 3 })
  }
  if (!hasText(form.average_patient_ratios)) {
    missing.push({ id: 'average_patient_ratios', label: 'Average patient ratios', step: 3 })
  }
  if (!hasText(form.specialized_medical_equipment)) {
    missing.push({ id: 'specialized_medical_equipment', label: 'Specialized medical equipment', step: 3 })
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
