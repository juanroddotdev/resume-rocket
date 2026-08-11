import type { EmployerEntry } from '~/types/candidate'

type FacilityGoogleSearchOptions = {
  /** Live link-strip query; preferred over employer.name when set. */
  searchQuery?: string
}

/**
 * Soft `term?` prompts for facility metrics research (no EMR — use EMR search).
 * Keep metric keywords short / unquoted so Google does not AND rare exact phrases.
 */
export const FACILITY_GOOGLE_SEARCH_PROMPTS = [
  'trauma level?',
  'beds?',
  'teaching?',
  'Magnet?',
] as const

/** Focused EMR / charting follow-up; brand names nudge tech-stack / job-post hits. */
export const FACILITY_GOOGLE_EMR_PROMPTS = [
  'EMR?',
  'EHR?',
  'charting system?',
  'Epic',
  'Cerner',
  'Meditech',
] as const

/** Readable labels for UI (trailing `?` stripped). */
export const FACILITY_GOOGLE_SEARCH_LABELS = FACILITY_GOOGLE_SEARCH_PROMPTS.map((p) =>
  p.replace(/\?$/, ''),
)

type EmployerLocation = Pick<EmployerEntry, 'name' | 'city' | 'state'>

function stripWrappingQuotes(value: string): string {
  return value.replace(/^"+|"+$/g, '').trim()
}

/**
 * Name + city/state for the query. When both are present as separate segments,
 * wrap each in quotes for disambiguation — do not quote metric prompts.
 */
function facilityNameAndLocation(
  employer: EmployerLocation,
  options?: FacilityGoogleSearchOptions,
): string[] {
  const typed = options?.searchQuery?.trim()
  const name = stripWrappingQuotes(typed || employer.name?.trim() || '')
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const locationAlreadyInName = Boolean(
    location && name && name.toLowerCase().includes(location.toLowerCase()),
  )
  const parts = [name, location && !locationAlreadyInName ? location : null].filter(
    (part): part is string => Boolean(part),
  )
  if (parts.length >= 2) {
    return parts.map((part) => `"${stripWrappingQuotes(part)}"`)
  }
  return parts
}

function googleSearchUrl(parts: Array<string | null | undefined>): string {
  const query = parts.filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

/**
 * Prefilled Google query for researching unlinked facility stats (no PHI beyond card fields).
 *
 * Quote name + city/state when both exist; leave metric prompts as soft `term?` keywords.
 * EMR / charting belong on {@link facilityGoogleEmrSearchUrl}.
 */
export function facilityGoogleSearchUrl(
  employer: EmployerLocation,
  options?: FacilityGoogleSearchOptions,
): string {
  return googleSearchUrl([
    ...facilityNameAndLocation(employer, options),
    ...FACILITY_GOOGLE_SEARCH_PROMPTS,
  ])
}

/** Focused Google query for EMR / charting when the broad verify search omits those. */
export function facilityGoogleEmrSearchUrl(
  employer: EmployerLocation,
  options?: FacilityGoogleSearchOptions,
): string {
  return googleSearchUrl([
    ...facilityNameAndLocation(employer, options),
    ...FACILITY_GOOGLE_EMR_PROMPTS,
  ])
}
