export const EMPLOYMENT_TYPE_OPTIONS = ['Travel', 'Staff', 'PRN'] as const
export type EmploymentTypeOption = (typeof EMPLOYMENT_TYPE_OPTIONS)[number]

/** Map free-text / parse values to a canonical employment type when possible. */
export function normalizeEmploymentType(value: string | null | undefined): EmploymentTypeOption | '' {
  const raw = (value || '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (lower.includes('travel')) return 'Travel'
  if (lower.includes('prn') || lower.includes('per diem') || lower.includes('per-diem')) return 'PRN'
  if (lower.includes('staff') || lower.includes('full-time') || lower.includes('full time')) return 'Staff'

  for (const option of EMPLOYMENT_TYPE_OPTIONS) {
    if (lower === option.toLowerCase()) return option
  }

  return ''
}

export function isKnownEmploymentType(value: string | null | undefined): value is EmploymentTypeOption {
  return EMPLOYMENT_TYPE_OPTIONS.includes(value as EmploymentTypeOption)
}
