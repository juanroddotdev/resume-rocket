import type {
  CredentialsMap,
  EducationEntry,
  EmployerEntry,
  LicenseEntry,
} from '../../types/candidate'
import { resolveCanonicalCert } from '../../utils/certificationOptions.ts'
import { resolveCandidateLicenses } from '../../utils/licenseRows.ts'
import type {
  ParseAudit,
  ParseAuditViewCertification,
  ParseAuditViewEducation,
  ParseAuditViewEmployer,
  ParseAuditViewLicense,
  ParseAuditViewResponse,
  ParseCertificationAudit,
  ParseEducationAudit,
  ParseLicenseAudit,
  ParseOutcome,
} from '../../types/parse'

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function employerNamesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() || ''
}

function formatLicenseLabel(entry: Pick<ParseLicenseAudit, 'state' | 'number' | 'expiry'>): string {
  const parts: string[] = []
  if (entry.state?.trim()) parts.push(entry.state.trim().toUpperCase())
  if (entry.number?.trim()) parts.push(entry.number.trim())
  if (entry.expiry?.trim()) parts.push(entry.expiry.trim())
  return parts.join(' · ')
}

function formatEducationLabel(entry: Pick<ParseEducationAudit, 'degree' | 'school'>): string {
  return [entry.degree?.trim(), entry.school?.trim()].filter(Boolean).join(' · ')
}

function certInWizard(name: string, credentials: CredentialsMap | null | undefined): boolean {
  if (!credentials) return false
  const canonical = resolveCanonicalCert(name) ?? name.toUpperCase()
  const entry = credentials[canonical] ?? credentials[name]
  return entry?.active === true
}

function licenseInWizard(entry: ParseLicenseAudit, wizardLicenses: LicenseEntry[]): boolean {
  const state = entry.state?.trim().toUpperCase()
  const number = entry.number?.trim()
  if (!state && !number) return false

  return wizardLicenses.some((row) => {
    const rowState = row.state?.trim().toUpperCase()
    const rowNumber = row.number?.trim()
    if (state && number) return rowState === state && rowNumber === number
    if (state) return rowState === state
    if (number) return rowNumber === number
    return false
  })
}

function educationInWizard(entry: ParseEducationAudit, wizardEducation: EducationEntry[]): boolean {
  const auditDegree = normalizeText(entry.degree)
  const auditSchool = normalizeText(entry.school)
  if (!auditDegree && !auditSchool) return false

  return wizardEducation.some((row) => {
    const rowDegree = normalizeText(row.degree)
    const rowSchool = normalizeText(row.school)
    if (auditDegree && auditSchool) {
      return rowDegree === auditDegree && rowSchool === auditSchool
    }
    if (auditDegree && rowDegree) {
      return rowDegree === auditDegree
        || rowDegree.includes(auditDegree)
        || auditDegree.includes(rowDegree)
    }
    if (auditSchool && rowSchool) {
      return rowSchool === auditSchool
        || rowSchool.includes(auditSchool)
        || auditSchool.includes(rowSchool)
    }
    return false
  })
}

function mapAuditArray<T>(
  value: unknown,
  mapper: (entry: Record<string, unknown>) => T | null,
): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const mapped = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map(mapper)
    .filter((entry): entry is T => entry !== null)
  return mapped.length ? mapped : undefined
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

  const suggestedEmployers = mapAuditArray(a.suggestedEmployers, (entry) => {
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (!name) return null
    return {
      name,
      ...(typeof entry.sourceSnippet === 'string' ? { sourceSnippet: entry.sourceSnippet } : {}),
    }
  })

  const suggestedCertifications = mapAuditArray(a.suggestedCertifications, (entry) => {
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (!name) return null
    return {
      name,
      ...(typeof entry.expiry === 'string' ? { expiry: entry.expiry } : {}),
      ...(typeof entry.sourceSnippet === 'string' ? { sourceSnippet: entry.sourceSnippet } : {}),
    }
  })

  const suggestedLicenses = mapAuditArray(a.suggestedLicenses, (entry) => {
    const mapped = {
      ...(typeof entry.state === 'string' ? { state: entry.state } : {}),
      ...(typeof entry.number === 'string' ? { number: entry.number } : {}),
      ...(typeof entry.expiry === 'string' ? { expiry: entry.expiry } : {}),
      ...(typeof entry.sourceSnippet === 'string' ? { sourceSnippet: entry.sourceSnippet } : {}),
    }
    if (!mapped.state && !mapped.number && !mapped.expiry) return null
    return mapped
  })

  const suggestedEducation = mapAuditArray(a.suggestedEducation, (entry) => {
    const mapped = {
      ...(typeof entry.degree === 'string' ? { degree: entry.degree } : {}),
      ...(typeof entry.school === 'string' ? { school: entry.school } : {}),
      ...(typeof entry.sourceSnippet === 'string' ? { sourceSnippet: entry.sourceSnippet } : {}),
    }
    if (!mapped.degree && !mapped.school) return null
    return mapped
  })

  return {
    ...(Array.isArray(a.identifiedFacilitiesRaw)
      ? { identifiedFacilitiesRaw: a.identifiedFacilitiesRaw.filter((v): v is string => typeof v === 'string') }
      : {}),
    ...(suggestedEmployers ? { suggestedEmployers } : {}),
    ...(suggestedCertifications ? { suggestedCertifications } : {}),
    ...(suggestedLicenses ? { suggestedLicenses } : {}),
    ...(suggestedEducation ? { suggestedEducation } : {}),
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
  wizardLicenses?: LicenseEntry[] | null
  wizardEducation?: EducationEntry[] | null
  wizardCredentials?: CredentialsMap | null
  licenseState?: string | null
  licenseNumber?: string | null
}): ParseAuditViewResponse {
  const outcome = parseOutcomeFromBlob(input.parsedResume)
  const audit = parseAuditFromBlob(input.parsedResume)
  const wizardEmployers = input.wizardEmployers ?? []
  const wizardLicenses = resolveCandidateLicenses({
    licenses: input.wizardLicenses,
    license_state: input.licenseState,
    license_number: input.licenseNumber,
  })
  const wizardEducation = input.wizardEducation ?? []
  const wizardCredentials = input.wizardCredentials

  const employers: ParseAuditViewEmployer[] = (audit?.suggestedEmployers ?? []).map(entry => ({
    name: entry.name,
    sourceSnippet: entry.sourceSnippet,
    inWizard: wizardEmployers.some(employer => employerNamesMatch(employer.name, entry.name)),
    missingSnippet: !entry.sourceSnippet?.trim(),
  }))

  const certifications: ParseAuditViewCertification[] = (audit?.suggestedCertifications ?? []).map(entry => ({
    name: entry.name,
    expiry: entry.expiry,
    sourceSnippet: entry.sourceSnippet,
    inWizard: certInWizard(entry.name, wizardCredentials),
    missingSnippet: !entry.sourceSnippet?.trim(),
  }))

  const licenses: ParseAuditViewLicense[] = (audit?.suggestedLicenses ?? []).map(entry => ({
    label: formatLicenseLabel(entry),
    state: entry.state,
    number: entry.number,
    expiry: entry.expiry,
    sourceSnippet: entry.sourceSnippet,
    inWizard: licenseInWizard(entry, wizardLicenses),
    missingSnippet: !entry.sourceSnippet?.trim(),
  }))

  const education: ParseAuditViewEducation[] = (audit?.suggestedEducation ?? []).map(entry => ({
    label: formatEducationLabel(entry),
    degree: entry.degree,
    school: entry.school,
    sourceSnippet: entry.sourceSnippet,
    inWizard: educationInWizard(entry, wizardEducation),
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
    certifications,
    licenses,
    education,
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
