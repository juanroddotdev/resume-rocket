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

  const entry: LicenseEntry = {}
  if (hasText(state)) entry.state = state
  if (hasText(number)) entry.number = number
  if (expiry) entry.expiry = expiry
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

/** DOCX formatting: CA · RN-12345 · 06/2027 */
export function formatLicenseRowForDocx(row: LicenseEntry): string {
  const parts: string[] = []
  if (row.state?.trim()) parts.push(row.state.trim().toUpperCase())
  if (row.number?.trim()) parts.push(row.number.trim())
  if (row.expiry?.trim()) parts.push(row.expiry.trim())
  return parts.join(' · ')
}

export function activeLicensesListForDocx(licenses: LicenseEntry[]): string[] {
  return licenses
    .map(formatLicenseRowForDocx)
    .filter(Boolean)
}

export function isLicenseRowComplete(row: LicenseEntry): boolean {
  return hasText(row.state) && hasText(row.number)
}

export function hasCompleteLicense(licenses: LicenseEntry[]): boolean {
  return licenses.some(isLicenseRowComplete)
}
