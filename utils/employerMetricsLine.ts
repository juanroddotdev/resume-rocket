import type { EmployerEntry } from '../types/candidate'

/** Matches VMS experience metrics separators in `template.docx`. */
export const EMPLOYER_METRICS_LINE_SEP = ' • '

export type EmployerMetricsLineInput = Pick<
  EmployerEntry,
  | 'unitBedCount'
  | 'beds'
  | 'traumaLevel'
  | 'teachingStatus'
  | 'emrSystem'
  | 'patientScope'
>

export type EmployerMetricsLineFields = {
  unitBedCount: string
  hospitalBeds: string
  traumaLevel: string
  teachingFacility: string
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
 * Order: unit beds → hospital beds → trauma → teaching → EMR → patient scope
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
    emrSystem: labeledEmr(emrRaw),
    patientScope: (employer.patientScope || '').trim(),
  }
}

/**
 * Ordered segments matching the Professional Experience metrics line.
 * Empty slots kept for index alignment with DOCX tags.
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
    fields.emrSystem,
    fields.patientScope,
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
