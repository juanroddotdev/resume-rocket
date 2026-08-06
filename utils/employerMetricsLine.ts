import type { EmployerEntry } from '../types/candidate'
import {
  CHARGE_NURSE_HIGHLIGHT_LABEL,
  PRECEPTOR_HIGHLIGHT_LABEL,
} from './employerClinicalFlags.ts'

/** Matches VMS experience metrics separators in `template.docx`. */
export const EMPLOYER_METRICS_LINE_SEP = ' • '

export type EmployerMetricsLineInput = Pick<
  EmployerEntry,
  | 'unitBedCount'
  | 'beds'
  | 'traumaLevel'
  | 'teachingStatus'
  | 'magnetStatus'
  | 'emrSystem'
  | 'patientScope'
  | 'chargeNurseExperience'
  | 'preceptorExperience'
>

export type EmployerMetricsLineFields = {
  unitBedCount: string
  hospitalBeds: string
  traumaLevel: string
  teachingFacility: string
  magnetFacility: string
  emrSystem: string
  patientScope: string
}

/** Labeled teaching segment for metrics line / DOCX (`Teaching Yes`). */
export function teachingFacilityLabelForMetrics(
  teachingStatus: boolean | undefined,
): string {
  if (teachingStatus === true) return 'Teaching Yes'
  if (teachingStatus === false) return 'Teaching No'
  return ''
}

/** Labeled Magnet segment for metrics line / DOCX (`Magnet Yes`). */
export function magnetFacilityLabelForMetrics(
  magnetStatus: boolean | undefined,
): string {
  if (magnetStatus === true) return 'Magnet Yes'
  if (magnetStatus === false) return 'Magnet No'
  return ''
}

function labeledUnitBeds(raw: string | null | undefined): string {
  const value = (raw || '').trim()
  if (!value) return ''
  if (/unit beds?\b/i.test(value)) return value
  return `${value} unit beds`
}

function labeledHospitalBeds(beds: number | null | undefined): string {
  if (beds == null || Number.isNaN(beds)) return ''
  return `${beds} hospital beds`
}

function labeledTrauma(raw: string | null | undefined): string {
  const value = (raw || '').trim()
  if (!value) return ''
  if (/^trauma\b/i.test(value) || /^level\b/i.test(value)) return value
  return `Trauma ${value}`
}

function labeledEmr(raw: string | null | undefined): string {
  const value = (raw || '').trim()
  if (!value) return ''
  if (/^emr\b/i.test(value)) return value
  return `EMR ${value}`
}

/**
 * Labeled values for each DOCX metrics tag (same strings used in the live stamp).
 * Order: unit beds → hospital beds → trauma → teaching → Magnet → EMR → patient scope
 */
export function employerMetricsLineFields(
  employer: EmployerMetricsLineInput,
  options?: { legacyEmrSystem?: string },
): EmployerMetricsLineFields {
  const emrRaw = (employer.emrSystem || options?.legacyEmrSystem || '').trim()
  return {
    unitBedCount: labeledUnitBeds(employer.unitBedCount),
    hospitalBeds: labeledHospitalBeds(employer.beds),
    traumaLevel: labeledTrauma(employer.traumaLevel),
    teachingFacility: teachingFacilityLabelForMetrics(employer.teachingStatus),
    magnetFacility: magnetFacilityLabelForMetrics(employer.magnetStatus),
    emrSystem: labeledEmr(emrRaw),
    patientScope: (employer.patientScope || '').trim(),
  }
}

/**
 * Ordered segments matching the Professional Experience metrics line.
 * Empty slots kept for index alignment with DOCX tags.
 * Charge/preceptor append when Yes so per-job packets show them (highlights loop is template-removed).
 */
export function employerMetricsLineParts(
  employer: EmployerMetricsLineInput,
  options?: { legacyEmrSystem?: string },
): string[] {
  const fields = employerMetricsLineFields(employer, options)
  return [
    fields.unitBedCount,
    fields.hospitalBeds,
    fields.traumaLevel,
    fields.teachingFacility,
    fields.magnetFacility,
    fields.emrSystem,
    fields.patientScope,
    employer.chargeNurseExperience === true ? CHARGE_NURSE_HIGHLIGHT_LABEL : '',
    employer.preceptorExperience === true ? PRECEPTOR_HIGHLIGHT_LABEL : '',
  ]
}

/**
 * Packet-style metrics string for UI stamp and mental model of DOCX output.
 * Omits empty slots (DOCX template still emits separators for blank tags until a follow-up).
 */
export function formatEmployerMetricsLine(
  employer: EmployerMetricsLineInput,
  options?: { legacyEmrSystem?: string },
): string {
  return employerMetricsLineParts(employer, options)
    .filter(Boolean)
    .join(EMPLOYER_METRICS_LINE_SEP)
}
