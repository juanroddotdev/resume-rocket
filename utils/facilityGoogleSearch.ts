import type { EmployerEntry } from '~/types/candidate'

/** Prefilled Google query for researching an unlinked facility (no PHI beyond card fields). */
export function facilityGoogleSearchUrl(employer: Pick<EmployerEntry, 'name' | 'city' | 'state'>): string {
  const location = [employer.city, employer.state].filter(Boolean).join(', ')
  const query = [
    employer.name?.trim(),
    location,
    '"trauma level"',
    '"total beds"',
    '"teaching hospital"',
  ]
    .filter(Boolean)
    .join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
