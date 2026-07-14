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

export function teachingFacilityLabelForMetrics(
  teachingStatus: boolean | undefined,
): string {
  if (teachingStatus === true) return 'Yes'
  if (teachingStatus === false) return 'No'
  return ''
}

/**
 * Ordered segments matching the Professional Experience metrics line:
 * unit beds • hospital beds • trauma • teaching • EMR • patient scope
 */
export function employerMetricsLineParts(
  employer: EmployerMetricsLineInput,
  options?: { legacyEmrSystem?: string },
): string[] {
  const emr = (employer.emrSystem || options?.legacyEmrSystem || '').trim()
  return [
    (employer.unitBedCount || '').trim(),
    employer.beds != null && !Number.isNaN(employer.beds) ? String(employer.beds) : '',
    (employer.traumaLevel || '').trim(),
    teachingFacilityLabelForMetrics(employer.teachingStatus),
    emr,
    (employer.patientScope || '').trim(),
  ]
}

/**
 * Live packet-style metrics string. Omits empty slots so the stamp stays readable
 * (DOCX template still emits separators for blank tags until a follow-up).
 */
export function formatEmployerMetricsLine(
  employer: EmployerMetricsLineInput,
  options?: { legacyEmrSystem?: string },
): string {
  return employerMetricsLineParts(employer, options)
    .filter(Boolean)
    .join(EMPLOYER_METRICS_LINE_SEP)
}
