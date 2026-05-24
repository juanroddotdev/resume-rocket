import type { ParsedResume } from '~/types/parse'

const CERT_PATTERN = /\b(BLS|ACLS|PALS|NIHSS|TNCC|CCRN)\b/gi
const LICENSE_STATE_PATTERN = /\b(RN|License)[#:\s]*([A-Z]{2})\b/i
const RN_LICENSE_PATTERN = /\b(?:RN|License\s*#?)\s*[:#]?\s*([A-Z0-9-]{4,})\b/i

export function parseResumeHeuristically(rawText: string): ParsedResume {
  const text = rawText.replace(/\s+/g, ' ').trim()

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i)?.[0]
  const phone = text.match(
    /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/,
  )?.[0]

  const detectedCredentials = [...new Set([...text.matchAll(CERT_PATTERN)].map(m => m[1]!.toUpperCase()))]

  const licenseState =
    text.match(LICENSE_STATE_PATTERN)?.[2]?.toUpperCase()
    || text.match(/\b([A-Z]{2})\s+RN\b/)?.[1]

  const licenseNumber = text.match(RN_LICENSE_PATTERN)?.[1]

  return {
    email,
    phone,
    licenseNumber,
    licenseState,
    detectedCredentials: detectedCredentials.length ? detectedCredentials : undefined,
    rawText: rawText.slice(0, 5000),
  }
}

export function hasParsedFields(parsed: ParsedResume): boolean {
  return Boolean(
    parsed.firstName
    || parsed.lastName
    || parsed.email
    || parsed.phone
    || parsed.licenseNumber
    || parsed.licenseState
    || parsed.specialties?.length
    || parsed.detectedCredentials?.length
    || parsed.employers?.length,
  )
}

export function mergeParsedResume(
  primary: ParsedResume | null,
  fallback: ParsedResume,
): ParsedResume {
  return {
    firstName: primary?.firstName || fallback.firstName,
    lastName: primary?.lastName || fallback.lastName,
    email: primary?.email || fallback.email,
    phone: primary?.phone || fallback.phone,
    licenseNumber: primary?.licenseNumber || fallback.licenseNumber,
    licenseState: primary?.licenseState || fallback.licenseState,
    specialties: primary?.specialties?.length ? primary.specialties : fallback.specialties,
    detectedCredentials: primary?.detectedCredentials?.length
      ? primary.detectedCredentials
      : fallback.detectedCredentials,
    employers: primary?.employers?.length ? primary.employers : fallback.employers,
    rawText: primary?.rawText || fallback.rawText,
  }
}
