import type { EmployerEntry } from '~/types/candidate'

type FacilityGoogleSearchOptions = {
  /** Live link-strip query; preferred over employer.name when set. */
  searchQuery?: string
}

/** Prefilled Google query for researching an unlinked facility (no PHI beyond card fields). */
export function facilityGoogleSearchUrl(
  employer: Pick<EmployerEntry, 'name' | 'city' | 'state'>,
  options?: FacilityGoogleSearchOptions,
): string {
  const typed = options?.searchQuery?.trim()
  const name = typed || employer.name?.trim()
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const locationAlreadyInName = Boolean(
    location && name && name.toLowerCase().includes(location.toLowerCase()),
  )
  const query = [
    name,
    location && !locationAlreadyInName ? location : null,
    '"trauma level"',
    '"total beds"',
    '"teaching hospital"',
    'Magnet',
  ]
    .filter(Boolean)
    .join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
