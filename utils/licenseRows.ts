import type { LicenseEntry } from '../types/candidate'
import { normalizeCredentialExpiry } from './credentialExpiry.ts'

function hasText(value?: string | null) {
  return Boolean(value?.trim())
}

/** Normalize one license row (state uppercase 2-char, trimmed number, MM/YYYY expiry). */
export function normalizeLicense(raw: unknown): LicenseEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const stateRaw = String(o.state ?? o.license_state ?? '').trim().toUpperCase()
  const numberRaw = String(o.number ?? o.license_number ?? '').trim()
  const expiryRaw = String(o.expiry ?? o.expiration ?? '').trim()
  const expiry = expiryRaw ? normalizeCredentialExpiry(expiryRaw) : undefined

  const state = stateRaw.length === 2 ? stateRaw : stateRaw.slice(0, 2)
  const number = numberRaw

  if (!hasText(state) && !hasText(number) && !expiry) return null

  const compact = normalizeCompactStatus(o.compact)
  const entry: LicenseEntry = {}
  if (hasText(state)) entry.state = state
  if (hasText(number)) entry.number = number
  if (expiry) entry.expiry = expiry
  if (compact) entry.compact = compact
  return entry
}

export function normalizeLicenses(raw: unknown): LicenseEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeLicense).filter((row): row is LicenseEntry => row !== null)
}

/** Build licenses[] from legacy scalar columns when JSONB is empty. */
export function licensesFromLegacyScalars(
  licenseState?: string | null,
  licenseNumber?: string | null,
): LicenseEntry[] {
  const state = licenseState?.trim().toUpperCase()
  const number = licenseNumber?.trim()
  if (!state && !number) return []
  const entry: LicenseEntry = {}
  if (state) entry.state = state.length === 2 ? state : state.slice(0, 2)
  if (number) entry.number = number
  return [entry]
}

/** Resolve canonical licenses: JSONB rows, else legacy scalars. */
export function resolveCandidateLicenses(input: {
  licenses?: unknown
  license_state?: string | null
  license_number?: string | null
}): LicenseEntry[] {
  const normalized = normalizeLicenses(input.licenses)
  if (normalized.length) return normalized
  return licensesFromLegacyScalars(input.license_state, input.license_number)
}

/** First row with state + number for primary scalar tags. */
export function primaryLicense(licenses: LicenseEntry[]): LicenseEntry | null {
  return licenses.find(row => hasText(row.state) && hasText(row.number)) ?? licenses[0] ?? null
}

/** Sync legacy scalar columns from primary license row (admin search compat). */
export function legacyScalarsFromLicenses(licenses: LicenseEntry[]): {
  license_state?: string
  license_number?: string
} {
  const primary = primaryLicense(licenses)
  if (!primary) return {}
  return {
    license_state: primary.state?.trim() || undefined,
    license_number: primary.number?.trim() || undefined,
  }
}

/** Canonical compact answers stored on a license row. */
export function normalizeCompactStatus(raw: unknown): string | undefined {
  const value = String(raw ?? '').trim()
  if (!value) return undefined
  const lower = value.toLowerCase()
  if (lower === 'yes') return 'Yes'
  if (lower === 'no') return 'No'
  if (lower === 'n/a' || lower === 'na') return 'N/A'
  return undefined
}

/** Compact/multistate Yes — No and N/A stay off the packet. */
export function isCompactLicenseYes(status?: string | null): boolean {
  return normalizeCompactStatus(status) === 'Yes'
}

/** Candidate-level compact column from per-row answers (any Yes wins). */
export function compactStatusFromLicenses(licenses: LicenseEntry[]): string {
  if (licenses.some(row => isCompactLicenseYes(row.compact))) return 'Yes'
  if (licenses.some(row => normalizeCompactStatus(row.compact) === 'No')) return 'No'
  if (licenses.some(row => normalizeCompactStatus(row.compact) === 'N/A')) return 'N/A'
  return ''
}

function anyLicenseHasCompactAnswer(licenses: LicenseEntry[]): boolean {
  return licenses.some(row => Boolean(normalizeCompactStatus(row.compact)))
}

export function licenseRowPrintsCompact(
  row: LicenseEntry,
  licenses: LicenseEntry[],
  legacyStatus?: string | null,
): boolean {
  if (!isLicenseRowComplete(row)) return false
  if (isCompactLicenseYes(row.compact)) return true
  if (normalizeCompactStatus(row.compact)) return false
  if (anyLicenseHasCompactAnswer(licenses)) return false
  const primary = primaryLicense(licenses)
  return isCompactLicenseYes(legacyStatus) && row === primary
}

/** Copy candidate compact Yes onto the primary row when no row has its own answer. */
export function backfillLicenseCompact<T extends LicenseEntry>(
  licenses: T[],
  globalCompact?: string | null,
): T[] {
  if (anyLicenseHasCompactAnswer(licenses)) return licenses
  if (!isCompactLicenseYes(globalCompact)) return licenses
  const primary = primaryLicense(licenses)
  if (!primary || !isLicenseRowComplete(primary)) return licenses
  return licenses.map(row => (row === primary ? { ...row, compact: 'Yes' } : row))
}

/** DOCX formatting: CA · RN-12345 · 06/2027 · Compact */
export function formatLicenseRowForDocx(
  row: LicenseEntry,
  options?: { compact?: boolean },
): string {
  const parts: string[] = []
  if (row.state?.trim()) parts.push(row.state.trim().toUpperCase())
  if (row.number?.trim()) parts.push(row.number.trim())
  if (row.expiry?.trim()) parts.push(row.expiry.trim())
  if (options?.compact) parts.push('Compact')
  return parts.join(' · ')
}

export function activeLicensesListForDocx(
  licenses: LicenseEntry[],
  compactStatus?: string | null,
): string[] {
  return licenses
    .map(row =>
      formatLicenseRowForDocx(row, {
        compact: licenseRowPrintsCompact(row, licenses, compactStatus),
      }),
    )
    .filter(Boolean)
}

export function isLicenseRowComplete(row: LicenseEntry): boolean {
  return hasText(row.state) && hasText(row.number)
}

export function hasCompleteLicense(licenses: LicenseEntry[]): boolean {
  return licenses.some(isLicenseRowComplete)
}
