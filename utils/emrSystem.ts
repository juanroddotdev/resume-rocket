import {
  EMR_CHARTING_GROUPS,
  EMR_CHARTING_GROUP_LABELS,
} from './emrChartingSystems.ts'
import { findCanonicalEmrPreset } from './emrSearch.ts'

export { EMR_CHARTING_GROUPS, EMR_CHARTING_GROUP_LABELS }

export const EMR_PRESET_OPTIONS = EMR_CHARTING_GROUP_LABELS.flatMap(
  label => EMR_CHARTING_GROUPS[label],
)

const EMR_PRESET_SET = new Set<string>(EMR_PRESET_OPTIONS)

export type EmrPreset = (typeof EMR_PRESET_OPTIONS)[number]
export const EMR_OTHER_OPTION = 'Other'

/** Map legacy stored values to current preset labels. */
const EMR_LEGACY_ALIASES: Record<string, string> = {
  'Cerner / Millennium': 'Cerner / Oracle Health Millennium',
  Meditech: 'MEDITECH (Expanse, Magic)',
  McKesson: 'McKesson Horizon Clinicals',
  Allscripts: 'Allscripts Sunrise',
  'Homecare Homebase': 'Homecare Homebase (HCHB)',
}

function normalizeStoredEmr(value: string): string {
  return EMR_LEGACY_ALIASES[value] ?? value
}

/** Resolve stored/custom EMR text to a canonical preset label when possible. */
export function resolveStoredEmrLabel(emrSystem: string | null | undefined): string {
  const value = normalizeStoredEmr((emrSystem || '').trim())
  if (!value) return ''
  return findCanonicalEmrPreset(value) ?? value
}

/** Normalize user input before persisting (aliases, preset casing, trimmed custom). */
export function commitEmrValue(raw: string): string {
  const trimmed = normalizeStoredEmr(raw.trim())
  if (!trimmed) return ''
  return findCanonicalEmrPreset(trimmed) ?? trimmed
}

export function resolveEmrFields(emrSystem: string | null | undefined) {
  const value = normalizeStoredEmr((emrSystem || '').trim())
  if (!value) {
    return { selection: '', custom: '' }
  }
  if (EMR_PRESET_SET.has(value)) {
    return { selection: value, custom: '' }
  }
  return { selection: EMR_OTHER_OPTION, custom: value }
}

/** Persist only preset or custom text — never the literal "Other" placeholder. */
export function emrSystemFromFields(selection: string, custom: string) {
  if (!selection) return ''
  if (selection === EMR_OTHER_OPTION) return custom.trim()
  return selection
}

export function isEmrComplete(selection: string, custom: string) {
  if (!selection) return false
  if (selection === EMR_OTHER_OPTION) return Boolean(custom.trim())
  return true
}

/** True when stored emrSystem value is a preset or non-empty custom Other. */
export function isStoredEmrComplete(emrSystem: string | null | undefined) {
  const { selection, custom } = resolveEmrFields(emrSystem)
  return isEmrComplete(selection, custom)
}

export function allEmployersEmrComplete(employers: { emrSystem?: string | null }[]) {
  if (!employers.length) return false
  return employers.every(e => isStoredEmrComplete(e.emrSystem))
}

/** Dedupe distinct EMR values from employer rows (stable order). */
export function employerEmrProficienciesUnion(employers: { emrSystem?: string | null }[]): string {
  const seen = new Set<string>()
  const values: string[] = []
  for (const employer of employers) {
    const value = (employer.emrSystem || '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    values.push(value)
  }
  return values.join(', ')
}

/** Admin table / list display — union of per-card EMR with legacy column fallback. */
export function displayCandidateEmr(row: {
  emr_system?: string | null
  employers?: { emrSystem?: string | null }[] | null
}): string {
  const union = employerEmrProficienciesUnion(row.employers || [])
  return union || row.emr_system?.trim() || ''
}

/** Copy global emr_system onto employers missing per-card EMR (legacy drafts). */
export function backfillEmployerEmrSystems<T extends { emrSystem?: string | null }>(
  employers: T[],
  globalEmr?: string | null,
): T[] {
  const fallback = (globalEmr || '').trim()
  if (!fallback) return employers
  return employers.map((employer) => {
    if ((employer.emrSystem || '').trim()) return employer
    return { ...employer, emrSystem: fallback }
  })
}
