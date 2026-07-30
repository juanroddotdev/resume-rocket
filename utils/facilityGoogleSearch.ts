import type { EmployerEntry } from '~/types/candidate'

type FacilityGoogleSearchOptions = {
  /** Live link-strip query; preferred over employer.name when set. */
  searchQuery?: string
}

/** Soft `term?` prompts for facility research (shared by URL builder + UI copy). */
export const FACILITY_GOOGLE_SEARCH_PROMPTS = [
  'trauma level?',
  'total beds?',
  'teaching hospital?',
  'Magnet?',
  'EMR?',
  'charting system?',
] as const

/** Focused EMR / charting follow-up when the broad search skips those items. */
export const FACILITY_GOOGLE_EMR_PROMPTS = ['EMR?', 'charting system?'] as const

/** Readable labels for UI (trailing `?` stripped). */
export const FACILITY_GOOGLE_SEARCH_LABELS = FACILITY_GOOGLE_SEARCH_PROMPTS.map((p) =>
  p.replace(/\?$/, ''),
)

type EmployerLocation = Pick<EmployerEntry, 'name' | 'city' | 'state'>

function facilityNameAndLocation(
  employer: EmployerLocation,
  options?: FacilityGoogleSearchOptions,
): string[] {
  const typed = options?.searchQuery?.trim()
  const name = typed || employer.name?.trim()
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const locationAlreadyInName = Boolean(
    location && name && name.toLowerCase().includes(location.toLowerCase()),
  )
  return [name, location && !locationAlreadyInName ? location : null].filter(
    (part): part is string => Boolean(part),
  )
}

function googleSearchUrl(parts: Array<string | null | undefined>): string {
  const query = parts.filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

/**
 * Prefilled Google query for researching an unlinked facility (no PHI beyond card fields).
 *
 * Use `term?` prompts (not many exact-phrase quotes). Quoting trauma/beds/teaching/EMR
 * together ANDs rare phrases and often returns zero hits — client prefers the ? form.
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

/** Focused Google query for EMR / charting when the broad verify search omits them. */
export function facilityGoogleEmrSearchUrl(
  employer: EmployerLocation,
  options?: FacilityGoogleSearchOptions,
): string {
  return googleSearchUrl([
    ...facilityNameAndLocation(employer, options),
    ...FACILITY_GOOGLE_EMR_PROMPTS,
  ])
}
