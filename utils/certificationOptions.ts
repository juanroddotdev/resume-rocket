/** Grouped certification presets for credentials step (client-provided list). */
export const CERTIFICATION_GROUPS = {
  'Life support & resuscitation': [
    'BLS',
    'ACLS',
    'PALS',
    'NRP',
    'STABLE',
  ],
  'Critical / emergency nursing': [
    'CCRN',
    'CEN',
    'TNCC',
    'ENPC',
    'NIHSS',
  ],
  Respiratory: [
    'RRT',
    'CRT',
  ],
  'Imaging / cardiac diagnostics': [
    'ARRT',
    'RDMS',
    'RDCS',
    'RVT',
    'RCIS',
    'RCES',
  ],
  Laboratory: [
    'MLS',
    'MLT',
  ],
  'Surgical / sterile processing': [
    'CST',
    'CRCST',
  ],
  'Pharmacy / medical assisting': [
    'CPhT',
    'CMA',
  ],
  'Safety / behavioral': [
    'CPI',
    'MOAB',
    'MAB',
    'QMHP',
  ],
  'Other clinical': [
    'PBT',
  ],
} as const satisfies Record<string, readonly string[]>

export type CertificationGroupLabel = keyof typeof CERTIFICATION_GROUPS

export const CERTIFICATION_GROUP_LABELS = Object.keys(CERTIFICATION_GROUPS) as CertificationGroupLabel[]

export const CERTIFICATION_OPTIONS = CERTIFICATION_GROUP_LABELS.flatMap(
  label => CERTIFICATION_GROUPS[label],
)

const CERTIFICATION_SET = new Set<string>(CERTIFICATION_OPTIONS)

/** Map parse / legacy labels to canonical certification keys. */
const CERTIFICATION_ALIASES: Record<string, string> = {
  'BASIC LIFE SUPPORT': 'BLS',
  'ADVANCED CARDIOVASCULAR LIFE SUPPORT': 'ACLS',
  'PEDIATRIC ADVANCED LIFE SUPPORT': 'PALS',
}

export function resolveCanonicalCert(name: string | null | undefined): string | undefined {
  const trimmed = (name || '').trim()
  if (!trimmed) return undefined

  const upper = trimmed.toUpperCase()
  if (CERTIFICATION_SET.has(upper)) return upper

  const alias = CERTIFICATION_ALIASES[upper]
  if (alias) return alias

  return CERTIFICATION_OPTIONS.find(option => option.toUpperCase() === upper)
}

/** Stable order for DOCX and UI: catalog order, then unknown active keys. */
export function orderedActiveCertificationKeys(activeKeys: string[]): string[] {
  const active = new Set(activeKeys.map(key => key.toUpperCase()))
  const ordered = CERTIFICATION_OPTIONS.filter(key => active.has(key))
  const extras = [...active]
    .filter(key => !CERTIFICATION_SET.has(key))
    .sort()
  return [...ordered, ...extras]
}
