import type { EmployerEntry } from '~/types/candidate'
import type {
  ParseAudit,
  ParseAuditViewEmployer,
  ParseAuditViewResponse,
  ParseOutcome,
} from '~/types/parse'

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function employerNamesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

export function parseOutcomeFromBlob(parsedResume: unknown): ParseOutcome | null {
  if (!parsedResume || typeof parsedResume !== 'object') return null
  const outcome = (parsedResume as { outcome?: unknown }).outcome
  if (!outcome || typeof outcome !== 'object') return null
  const o = outcome as Record<string, unknown>
  if (typeof o.fields_found !== 'number') return null
  return {
    fields_found: o.fields_found,
    partial_parse: Boolean(o.partial_parse),
    document_scan: Boolean(o.document_scan),
    gemini_failed: Boolean(o.gemini_failed),
    parse_failed: Boolean(o.parse_failed),
  }
}

export function parseAuditFromBlob(parsedResume: unknown): ParseAudit | null {
  if (!parsedResume || typeof parsedResume !== 'object') return null
  const audit = (parsedResume as { audit?: unknown }).audit
  if (!audit || typeof audit !== 'object') return null
  const a = audit as Record<string, unknown>
  if (typeof a.capturedAt !== 'string') return null
  return {
    ...(Array.isArray(a.identifiedFacilitiesRaw)
      ? { identifiedFacilitiesRaw: a.identifiedFacilitiesRaw.filter((v): v is string => typeof v === 'string') }
      : {}),
    ...(Array.isArray(a.suggestedEmployers)
      ? {
          suggestedEmployers: a.suggestedEmployers
            .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
            .map((entry) => {
              const name = typeof entry.name === 'string' ? entry.name : ''
              if (!name) return null
              return {
                name,
                ...(typeof entry.sourceSnippet === 'string' ? { sourceSnippet: entry.sourceSnippet } : {}),
              }
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
        }
      : {}),
    capturedAt: a.capturedAt,
  }
}

export function buildParseAuditView(input: {
  candidateId: string
  firstName: string | null
  lastName: string | null
  parseError: string | null
  parsedResume: unknown
  wizardEmployers: EmployerEntry[] | null
}): ParseAuditViewResponse {
  const outcome = parseOutcomeFromBlob(input.parsedResume)
  const audit = parseAuditFromBlob(input.parsedResume)
  const wizardEmployers = input.wizardEmployers ?? []

  const employers: ParseAuditViewEmployer[] = (audit?.suggestedEmployers ?? []).map((entry) => ({
    name: entry.name,
    sourceSnippet: entry.sourceSnippet,
    inWizard: wizardEmployers.some(employer => employerNamesMatch(employer.name, entry.name)),
    missingSnippet: !entry.sourceSnippet?.trim(),
  }))

  const facilitiesWithoutEmployer = (audit?.identifiedFacilitiesRaw ?? []).filter(
    facility => !wizardEmployers.some(employer => employerNamesMatch(employer.name, facility)),
  )

  return {
    candidateId: input.candidateId,
    firstName: input.firstName,
    lastName: input.lastName,
    parseError: input.parseError,
    outcome,
    audit,
    employers,
    facilitiesWithoutEmployer,
  }
}

/** Fuzzy check that a snippet plausibly came from extracted resume text (regression tests). */
export function snippetOverlapsRawText(snippet: string, rawText: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()
  const normalizedSnippet = normalize(snippet)
  const normalizedRaw = normalize(rawText)
  if (!normalizedSnippet || !normalizedRaw) return false
  if (normalizedRaw.includes(normalizedSnippet)) return true

  const words = normalizedSnippet.split(' ').filter(word => word.length > 3)
  if (!words.length) return false
  const matched = words.filter(word => normalizedRaw.includes(word))
  return matched.length >= Math.min(3, words.length)
}
