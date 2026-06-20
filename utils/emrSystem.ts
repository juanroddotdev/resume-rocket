export const EMR_PRESET_OPTIONS = [
  'Epic',
  'Cerner / Millennium',
  'Meditech',
  'McKesson',
  'Allscripts',
  'CPSI',
  'PointClickCare',
  'AlayaCare',
  'Homecare Homebase',
  'MatrixCare',
] as const
export type EmrPreset = (typeof EMR_PRESET_OPTIONS)[number]
export const EMR_OTHER_OPTION = 'Other'

export function resolveEmrFields(emrSystem: string | null | undefined) {
  const value = (emrSystem || '').trim()
  if (!value) {
    return { selection: '', custom: '' }
  }
  if ((EMR_PRESET_OPTIONS as readonly string[]).includes(value)) {
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
