import type { EmployerEntry, LicenseEntry } from '../types/candidate'
import { employerEmrProficienciesUnion } from './emrSystem.ts'
import type { ProfessionalSnapshotKey } from './professionalSnapshot.ts'
import { formatLicenseRowForDocx, resolveCandidateLicenses } from './licenseRows.ts'

export interface SupplementalBucketItem {
  id: string
  label: string
  value: string
  /** When set, UI can apply this value onto that snapshot line. */
  applyTargetKey?: ProfessionalSnapshotKey
}

export interface SupplementalBucketCandidate {
  specialties?: string[] | null
  years_nursing_experience?: string | null
  compact_license_status?: string | null
  average_patient_ratios?: string | null
  specialized_medical_equipment?: string | null
  emr_system?: string | null
  employers?: EmployerEntry[] | null
  licenses?: LicenseEntry[] | null
  license_state?: string | null
  license_number?: string | null
}

function pushItem(
  items: SupplementalBucketItem[],
  item: SupplementalBucketItem,
) {
  if (!item.value.trim()) return
  items.push({ ...item, value: item.value.trim() })
}

/**
 * Fields still collected in wizard/parse that the July 2026 contract
 * no longer renders — for admin copy / apply-to-snapshot.
 */
export function buildSupplementalBucket(
  candidate: SupplementalBucketCandidate,
): SupplementalBucketItem[] {
  const items: SupplementalBucketItem[] = []
  const employers = candidate.employers || []

  pushItem(items, {
    id: 'specialties',
    label: 'Clinical specialties',
    value: (candidate.specialties || []).filter(Boolean).join(', '),
    applyTargetKey: 'snapshot_specialty',
  })
  pushItem(items, {
    id: 'years_nursing_experience',
    label: 'Years of nursing experience',
    value: candidate.years_nursing_experience || '',
    applyTargetKey: 'snapshot_years_experience',
  })
  pushItem(items, {
    id: 'compact_license_status',
    label: 'Compact license status',
    value: candidate.compact_license_status || '',
  })
  pushItem(items, {
    id: 'average_patient_ratios',
    label: 'Patient ratios (candidate)',
    value: candidate.average_patient_ratios || '',
    applyTargetKey: 'snapshot_patient_ratios_managed',
  })
  pushItem(items, {
    id: 'specialized_medical_equipment',
    label: 'Specialized medical equipment',
    value: candidate.specialized_medical_equipment || '',
    applyTargetKey: 'snapshot_equipment_skills',
  })

  const emr =
    employerEmrProficienciesUnion(employers) || candidate.emr_system?.trim() || ''
  pushItem(items, {
    id: 'emr_union',
    label: 'EMR systems (union)',
    value: emr,
    applyTargetKey: 'snapshot_emr_systems',
  })

  const licenses = resolveCandidateLicenses({
    licenses: candidate.licenses,
    license_state: candidate.license_state,
    license_number: candidate.license_number,
  })
  if (licenses.length > 1) {
    pushItem(items, {
      id: 'licenses_all',
      label: 'All licenses (formatted)',
      value: licenses.map(formatLicenseRowForDocx).filter(Boolean).join('; '),
    })
  }

  employers.forEach((employer, index) => {
    const prefix = employer.name?.trim() || `Employer ${index + 1}`
    pushItem(items, {
      id: `employer-${index}-type`,
      label: `${prefix}: employment type`,
      value: employer.employmentType || '',
      applyTargetKey:
        (employer.employmentType || '').toLowerCase().includes('travel')
          ? 'snapshot_travel_experience'
          : undefined,
    })
    pushItem(items, {
      id: `employer-${index}-role`,
      label: `${prefix}: role / unit`,
      value: employer.role || '',
      applyTargetKey: 'snapshot_specialty',
    })
    pushItem(items, {
      id: `employer-${index}-highlights`,
      label: `${prefix}: highlights`,
      value: (employer.highlights || []).filter(Boolean).join('; '),
    })
    pushItem(items, {
      id: `employer-${index}-floated`,
      label: `${prefix}: floated units`,
      value: (employer.floatedUnits || []).filter(Boolean).join(', '),
      applyTargetKey: 'snapshot_float_experience',
    })
    pushItem(items, {
      id: `employer-${index}-equipment`,
      label: `${prefix}: equipment / procedures`,
      value: (employer.equipmentProcedures || []).filter(Boolean).join(', '),
      applyTargetKey: 'snapshot_equipment_skills',
    })
    pushItem(items, {
      id: `employer-${index}-avg-patients`,
      label: `${prefix}: avg daily patients`,
      value: employer.avgDailyPatients || '',
      applyTargetKey: 'snapshot_patient_ratios_managed',
    })
    pushItem(items, {
      id: `employer-${index}-acuity`,
      label: `${prefix}: patient acuity`,
      value: employer.patientAcuity || '',
    })
  })

  return items
}
