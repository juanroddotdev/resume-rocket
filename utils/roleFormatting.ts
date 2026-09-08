import type { EmployerEntry } from '../types/candidate'
import { normalizeEmploymentType } from './employmentType.ts'

const NURSE_TITLE_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bregistered\s+nurse\b/gi, 'RN'],
  [/\blicensed\s+practical\s+nurse\b/gi, 'LPN'],
  [/\blicensed\s+vocational\s+nurse\b/gi, 'LVN'],
  [/\bnurse\s+practitioner\b/gi, 'NP'],
]

const CREDENTIAL_TOKEN = 'RN|LPN|LVN|NP'
const LEADING_TYPE_RE = new RegExp(
  `^(travel|staff|prn|per[\\s-]*diem)(?:\\s+(?:${CREDENTIAL_TOKEN}))?\\b[\\s,—–-]*`,
  'i',
)
const LEADING_CREDENTIAL_RE = new RegExp(
  `^(${CREDENTIAL_TOKEN})\\b(?:[\\s,—–-]+|$)`,
  'i',
)
const HAS_CREDENTIAL_RE = new RegExp(`\\b(${CREDENTIAL_TOKEN})\\b`, 'i')

export interface FormattedEmployerRole {
  /** Primary experience heading (`experience_unit_specialty`). */
  unitSpecialty: string
  /** Secondary role line (`experience_role_details`) when not redundant. */
  roleDetails: string
  /** Normalized role string for storage / form display. */
  displayRole: string
}

export interface FormatEmployerRoleOptions {
  /** When true, prefix the heading with RN if the role body has no credential. Default false. */
  includeRnPrefix?: boolean
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
      .replace(/\s*,\s+/g, ', '),
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

function compactRoleBody(rawRole: string): string {
  const abbreviated = abbreviateNurseTitles(rawRole)
  if (!abbreviated) return ''
  const { title, specialty } = splitRoleAndSpecialty(abbreviated)
  if (!title && !specialty) return abbreviated
  if (!specialty) return title
  if (containsPhrase(title, specialty)) return title
  return collapseWhitespace(`${title} — ${specialty}`)
}

function stripLeadingTypeAndCredential(value: string): string {
  let text = collapseWhitespace(value)
  text = collapseWhitespace(text.replace(LEADING_TYPE_RE, ''))
  text = collapseWhitespace(text.replace(LEADING_CREDENTIAL_RE, ''))
  return text
}

function roleHasCredential(value: string): boolean {
  return HAS_CREDENTIAL_RE.test(value)
}

function typeDetailSuffix(employer: Pick<EmployerEntry, 'employmentType' | 'prnSchedule' | 'travelDetail'>): string {
  const type = normalizeEmploymentType(employer.employmentType)
  if (type === 'PRN') {
    const schedule = employer.prnSchedule?.trim()
    return schedule ? ` (${schedule})` : ''
  }
  if (type === 'Travel') {
    const detail = employer.travelDetail?.trim()
    return detail ? ` (${detail})` : ''
  }
  return ''
}

function formatTypeSegment(
  employer: Pick<EmployerEntry, 'employmentType' | 'prnSchedule' | 'travelDetail'>,
  withCredential: boolean,
): string {
  const type = normalizeEmploymentType(employer.employmentType)
  const credential = withCredential ? ' RN' : ''
  if (!type) return withCredential ? 'RN' : ''
  return `${type}${credential}${typeDetailSuffix(employer)}`
}

function joinHeading(prefix: string, body: string): string {
  if (prefix && body) {
    if (containsPhrase(body, prefix) || body.toLowerCase().startsWith(prefix.toLowerCase())) {
      return body
    }
    return collapseWhitespace(`${prefix} — ${body}`)
  }
  return prefix || body
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
  employer: Pick<EmployerEntry, 'role' | 'employmentType' | 'prnSchedule' | 'travelDetail'>,
  primarySpecialty: string,
  options?: FormatEmployerRoleOptions,
): FormattedEmployerRole {
  const includeRnPrefix = options?.includeRnPrefix === true
  const rawRole = employer.role?.trim() || ''
  const fallback = primarySpecialty.trim()
  const displayRole = rawRole ? compactRoleBody(rawRole) : ''

  let body = displayRole ? stripLeadingTypeAndCredential(displayRole) : ''
  if (!rawRole && fallback) {
    body = stripLeadingTypeAndCredential(compactRoleBody(fallback) || fallback)
  }

  const typeSegment = formatTypeSegment(employer, includeRnPrefix && !roleHasCredential(body))
  const unitSpecialty = joinHeading(typeSegment, body)

  const abbreviatedTitle = abbreviateNurseTitles(stripLeadingTravel(splitRoleAndSpecialty(rawRole).title || rawRole))
  const roleDetails = roleDetailsForDocx(abbreviatedTitle || rawRole, unitSpecialty, splitRoleAndSpecialty(rawRole).specialty)

  return {
    unitSpecialty,
    roleDetails,
    displayRole,
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
  if (/^(RN|LPN|LVN|NP)$/i.test(roleText)) return ''
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
