import type { EmployerEntry } from '../types/candidate'

export const CHARGE_NURSE_HIGHLIGHT_LABEL = 'Charge nurse experience'
export const PRECEPTOR_HIGHLIGHT_LABEL = 'Preceptor experience'

export function highlightsMentionKeyword(
  highlights: string[] | undefined,
  keyword: string,
): boolean {
  const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
  return (highlights || []).some(line => pattern.test(line))
}

/** Merge wizard booleans into DOCX highlights; always append canonical labels when Yes. */
export function experienceHighlightsForDocx(
  employer: Pick<
    EmployerEntry,
    'highlights' | 'chargeNurseExperience' | 'preceptorExperience'
  >,
): string[] {
  const items = [...(employer.highlights || [])]

  if (employer.chargeNurseExperience === true && !items.includes(CHARGE_NURSE_HIGHLIGHT_LABEL)) {
    items.push(CHARGE_NURSE_HIGHLIGHT_LABEL)
  }

  if (employer.preceptorExperience === true && !items.includes(PRECEPTOR_HIGHLIGHT_LABEL)) {
    items.push(PRECEPTOR_HIGHLIGHT_LABEL)
  }

  return items
}

/** Packet bullets under job metrics — user highlights only (charge/preceptor stay on the metrics line). */
export function experienceHighlightBulletsForDocx(
  employer: Pick<EmployerEntry, 'highlights'>,
): string[] {
  const skip = new Set([
    CHARGE_NURSE_HIGHLIGHT_LABEL.toLowerCase(),
    PRECEPTOR_HIGHLIGHT_LABEL.toLowerCase(),
  ])
  return (employer.highlights || [])
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0 && !skip.has(item.toLowerCase()))
}

/** Honor explicit Gemini booleans before highlight inference. */
export function resolveClinicalFlagFromParse(
  explicit: boolean | undefined,
  inferred: boolean | undefined,
): boolean | undefined {
  if (explicit === true) return true
  if (explicit === false) return false
  return inferred
}

/** Prefill yes/no toggles when parse only captured these in free-text highlights. */
export function inferClinicalFlagsFromHighlights(highlights?: string[]): {
  chargeNurseExperience?: boolean
  preceptorExperience?: boolean
} {
  if (!highlights?.length) return {}

  const chargeNurseExperience = highlightsMentionKeyword(highlights, 'charge')
    ? true
    : undefined
  const preceptorExperience = highlightsMentionKeyword(highlights, 'preceptor')
    ? true
    : undefined

  return {
    ...(chargeNurseExperience ? { chargeNurseExperience } : {}),
    ...(preceptorExperience ? { preceptorExperience } : {}),
  }
}

export function triStateBoolValue(value: boolean | undefined): '' | 'yes' | 'no' {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return ''
}

export function triStateBoolFromSelect(raw: string): boolean | undefined {
  if (raw === 'yes') return true
  if (raw === 'no') return false
  return undefined
}
