import type { EmployerEntry } from '../types/candidate'
import { normalizeEmploymentType } from './employmentType.ts'

const NURSE_TITLE_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bregistered\s+nurse\b/gi, 'RN'],
  [/\blicensed\s+practical\s+nurse\b/gi, 'LPN'],
  [/\blicensed\s+vocational\s+nurse\b/gi, 'LVN'],
  [/\bnurse\s+practitioner\b/gi, 'NP'],
]

export interface FormattedEmployerRole {
  /** Primary experience heading (`experience_unit_specialty`). */
  unitSpecialty: string
  /** Secondary role line (`experience_role_details`) when not redundant. */
  roleDetails: string
  /** Normalized role string for storage / form display. */
  displayRole: string
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function abbreviateNurseTitles(value: string): string {
  let text = collapseWhitespace(value)
  for (const [pattern, replacement] of NURSE_TITLE_ABBREVIATIONS) {
    text = text.replace(pattern, replacement)
  }
  return collapseWhitespace(text)
}

function stripLeadingTravel(value: string): string {
  return collapseWhitespace(value.replace(/^travel\b[\s,—–-]*/i, ''))
}

function normalizeSpecialtyPhrase(value: string): string {
  return collapseWhitespace(
    value
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s*,\s*/g, ', '),
  )
}

function splitRoleAndSpecialty(raw: string): { title: string; specialty: string } {
  const text = collapseWhitespace(raw)
  if (!text) return { title: '', specialty: '' }

  const commaParts = text.split(',').map(part => part.trim()).filter(Boolean)
  if (commaParts.length >= 2) {
    return {
      title: commaParts[0]!,
      specialty: normalizeSpecialtyPhrase(commaParts.slice(1).join(', ')),
    }
  }

  const dashMatch = /\s+[—–-]\s+/.exec(text)
  if (dashMatch && dashMatch.index != null) {
    return {
      title: text.slice(0, dashMatch.index).trim(),
      specialty: normalizeSpecialtyPhrase(text.slice(dashMatch.index + dashMatch[0].length)),
    }
  }

  return { title: text, specialty: '' }
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function isRedundantRoleDetail(unitSpecialty: string, roleDetails: string): boolean {
  const unit = unitSpecialty.trim()
  const detail = roleDetails.trim()
  if (!detail) return true
  if (unit.toLowerCase() === detail.toLowerCase()) return true
  if (containsPhrase(unit, detail)) return true
  if (containsPhrase(detail, unit)) return true
  return false
}

function buildTravelUnitLine(title: string, specialty: string): string {
  const abbreviated = abbreviateNurseTitles(stripLeadingTravel(title))
  const hasCredential = /\b(RN|LPN|LVN|NP)\b/i.test(abbreviated)
  const travelTitle = hasCredential
    ? `Travel ${abbreviated.replace(/^travel\s+/i, '').trim()}`
    : abbreviated
      ? `Travel RN — ${abbreviated}`
      : 'Travel RN'

  if (!specialty) return collapseWhitespace(travelTitle)
  if (containsPhrase(travelTitle, specialty)) return collapseWhitespace(travelTitle)
  return collapseWhitespace(`${travelTitle} — ${specialty}`)
}

function buildStaffUnitLine(title: string, specialty: string, fallback: string): string {
  const abbreviated = abbreviateNurseTitles(title)
  if (!abbreviated && !specialty) return fallback
  if (!abbreviated) return specialty
  if (!specialty) return abbreviated
  if (containsPhrase(abbreviated, specialty)) return abbreviated
  return collapseWhitespace(`${abbreviated} — ${specialty}`)
}

/** Normalize a free-text employer role for storage (parse + light UI cleanup). */
export function normalizeEmployerRole(
  role: string | null | undefined,
  options?: {
    employmentType?: string | null
    primarySpecialty?: string | null
  },
): string {
  const formatted = formatEmployerRoleForDocx(
    { role: role || '', employmentType: options?.employmentType || '' },
    options?.primarySpecialty || '',
  )
  return formatted.displayRole
}

/** Format employer role for DOCX headings and optional form display. */
export function formatEmployerRoleForDocx(
  employer: Pick<EmployerEntry, 'role' | 'employmentType'>,
  primarySpecialty: string,
): FormattedEmployerRole {
  const rawRole = employer.role?.trim() || ''
  const fallback = primarySpecialty.trim()
  const isTravel =
    normalizeEmploymentType(employer.employmentType) === 'Travel'
    || /\btravel\b/i.test(rawRole)

  if (!rawRole) {
    const unitSpecialty = fallback
    return {
      unitSpecialty,
      roleDetails: '',
      displayRole: unitSpecialty,
    }
  }

  const { title, specialty } = splitRoleAndSpecialty(rawRole)
  const unitSpecialty = isTravel
    ? buildTravelUnitLine(title, specialty)
    : buildStaffUnitLine(title, specialty, fallback || abbreviateNurseTitles(rawRole))

  const abbreviatedTitle = abbreviateNurseTitles(stripLeadingTravel(title))
  const roleDetails = roleDetailsForDocx(abbreviatedTitle || rawRole, unitSpecialty, specialty)

  return {
    unitSpecialty,
    roleDetails,
    displayRole: unitSpecialty,
  }
}

/**
 * Secondary role line — omitted when it would repeat the unit/specialty heading.
 */
export function roleDetailsForDocx(
  role: string | undefined,
  unitSpecialty: string,
  embeddedSpecialty = '',
): string {
  const roleText = abbreviateNurseTitles((role || '').trim())
  const unitText = unitSpecialty.trim()
  if (!roleText) return ''
  if (!unitText) return roleText
  if (roleText.toLowerCase() === unitText.toLowerCase()) return ''
  if (containsPhrase(unitText, roleText)) return ''
  if (containsPhrase(roleText, unitText)) return ''
  if (embeddedSpecialty && containsPhrase(unitText, embeddedSpecialty)) return ''
  if (isRedundantRoleDetail(unitText, roleText)) return ''
  return roleText
}

/** Apply travel role formatting to a parsed or edited employer row. */
export function formatEmployerEntryRole(
  employer: EmployerEntry,
  primarySpecialty?: string | null,
): EmployerEntry {
  const role = employer.role?.trim()
  if (!role) return employer

  const displayRole = normalizeEmployerRole(role, {
    employmentType: employer.employmentType,
    primarySpecialty,
  })
  if (!displayRole || displayRole === role) return employer
  return { ...employer, role: displayRole }
}
