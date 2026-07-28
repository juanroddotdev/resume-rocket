import type { EducationEntry } from '../types/candidate.ts'

/** City, ST fragment for display / DOCX (empty if neither set). */
export function formatEducationLocation(entry: Pick<EducationEntry, 'city' | 'state'>): string {
  return [entry.city?.trim(), entry.state?.trim()].filter(Boolean).join(', ')
}

/** School name with optional (City, ST) for DOCX education_school_name. */
export function formatEducationSchoolForDocx(entry: EducationEntry): string {
  const school = entry.school?.trim() || ''
  const location = formatEducationLocation(entry)
  if (!school) return location ? `(${location})` : ''
  if (!location) return school
  return `${school} (${location})`
}

export function educationHasLocationSuggestion(entry: EducationEntry): boolean {
  const hasCommitted = Boolean(entry.city?.trim() || entry.state?.trim())
  if (hasCommitted) return false
  return Boolean(entry.suggestedCity?.trim() || entry.suggestedState?.trim())
}

export function applyEducationLocationSuggestion(entry: EducationEntry): EducationEntry {
  const next: EducationEntry = { ...entry }
  if (entry.suggestedCity?.trim()) next.city = entry.suggestedCity.trim()
  if (entry.suggestedState?.trim()) next.state = entry.suggestedState.trim()
  delete next.suggestedCity
  delete next.suggestedState
  return next
}

export function dismissEducationLocationSuggestion(entry: EducationEntry): EducationEntry {
  const next: EducationEntry = { ...entry }
  delete next.suggestedCity
  delete next.suggestedState
  return next
}
