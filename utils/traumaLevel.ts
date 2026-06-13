/** Canonical trauma level values stored on employers and in hospital DB. */
export const TRAUMA_LEVEL_OPTIONS = ['I', 'II', 'III', 'IV'] as const

export type TraumaLevelOption = (typeof TRAUMA_LEVEL_OPTIONS)[number]

/** Normalize free-text or numeric trauma input to Roman level when possible. */
export function normalizeTraumaLevel(value: string | null | undefined): string {
  const raw = value?.trim().toUpperCase()
  if (!raw) return ''

  if (raw === '1') return 'I'
  if (raw === '2') return 'II'
  if (raw === '3') return 'III'
  if (raw === '4') return 'IV'

  const roman = raw.match(/\b(IV|III|II|I)\b/)
  if (roman) return roman[1]

  if (TRAUMA_LEVEL_OPTIONS.includes(raw as TraumaLevelOption)) return raw

  return value.trim()
}

export function isKnownTraumaLevel(value: string | null | undefined): boolean {
  const normalized = normalizeTraumaLevel(value)
  return TRAUMA_LEVEL_OPTIONS.includes(normalized as TraumaLevelOption)
}
