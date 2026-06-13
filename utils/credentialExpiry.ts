/** Canonical credential expiration format stored and rendered in DOCX. */
export const CREDENTIAL_EXPIRY_PLACEHOLDER = 'MM/YYYY'

const MM_YYYY = /^(\d{1,2})\/(\d{4})$/
const ISO_MONTH = /^(\d{4})-(\d{2})(?:-\d{2})?$/

function padMonth(month: number): string | null {
  if (month < 1 || month > 12) return null
  return String(month).padStart(2, '0')
}

/** Normalize legacy or user input to MM/YYYY when parseable; otherwise undefined. */
export function normalizeCredentialExpiry(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const slash = trimmed.match(MM_YYYY)
  if (slash) {
    const month = padMonth(Number(slash[1]))
    const year = Number(slash[2])
    if (month && year >= 1900 && year <= 2100) return `${month}/${year}`
    return undefined
  }

  const iso = trimmed.match(ISO_MONTH)
  if (iso) {
    const month = padMonth(Number(iso[2]))
    const year = Number(iso[1])
    if (month && year >= 1900 && year <= 2100) return `${month}/${year}`
    return undefined
  }

  return undefined
}

/** Format digits as MM/YYYY while typing (max 7 chars). */
export function formatCredentialExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/** True when value normalizes to a complete MM/YYYY. */
export function isCompleteCredentialExpiry(value: string): boolean {
  const normalized = normalizeCredentialExpiry(value)
  return normalized !== undefined && /^\d{2}\/\d{4}$/.test(normalized)
}

/** Display stored expiry in MM/YYYY when possible; pass through partial in-progress input. */
export function displayCredentialExpiry(value: string | null | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return normalizeCredentialExpiry(trimmed) ?? trimmed
}
