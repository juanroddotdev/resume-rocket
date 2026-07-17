import type { ParsedResume } from '~/types/parse'
import { normalizeLicense } from '../../utils/licenseRows.ts'

function preferPrimary<T>(primary: T | undefined, fallback: T | undefined): T | undefined {
  if (primary === undefined || primary === null) return fallback
  if (typeof primary === 'string' && !primary.trim()) return fallback
  if (Array.isArray(primary) && primary.length === 0) return fallback
  return primary
}

export function parseResumeHeuristically(rawText: string): ParsedResume {
  const text = rawText.replace(/\s+/g, ' ').trim()

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i)?.[0]
  const phone = text.match(
    /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/,
  )?.[0]

  const detectedCredentials = [...new Set([...text.matchAll(/\b(BLS|ACLS|PALS|NIHSS|TNCC|CCRN)\b/gi)].map(m => m[1]!.toUpperCase()))]

  const licenseState =
    text.match(/\b(RN|License)[#:\s]*([A-Z]{2})\b/i)?.[2]?.toUpperCase()
    || text.match(/\b([A-Z]{2})\s+RN\b/)?.[1]

  const licenseNumber = text.match(/\b(?:RN|License\s*#?)\s*[:#]?\s*([A-Z0-9-]{4,})\b/i)?.[1]
  const licenses = licenseState || licenseNumber
    ? [normalizeLicense({ state: licenseState, number: licenseNumber })].filter(
      (row): row is NonNullable<typeof row> => row !== null,
    )
    : undefined

  return {
    email,
    phone,
    licenseNumber,
    licenseState,
    licenses,
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
    || parsed.homeAddress
    || parsed.homeCity
    || parsed.homeState
    || parsed.licenseNumber
    || parsed.licenseState
    || parsed.licenses?.length
    || parsed.specialties?.length
    || parsed.yearsNursingExperience
    || parsed.compactLicenseStatus
    || parsed.averagePatientRatios
    || parsed.specializedMedicalEquipment
    || parsed.education?.length
    || parsed.detectedCredentials?.length
    || parsed.certificationDetails?.length
    || parsed.employers?.length,
  )
}

export function mergeParsedResume(
  primary: ParsedResume | null,
  fallback: ParsedResume,
): ParsedResume {
  const mergedCerts = [
    ...(primary?.detectedCredentials || []),
    ...(fallback.detectedCredentials || []),
  ]
  const uniqueCerts = mergedCerts.length ? [...new Set(mergedCerts)] : undefined

  const certDetails = [
    ...(primary?.certificationDetails || []),
    ...(fallback.certificationDetails || []),
  ]
  const certDetailsByName = new Map<string, { name: string, expiry?: string }>()
  for (const cert of certDetails) {
    certDetailsByName.set(cert.name.toUpperCase(), cert)
  }

  return {
    firstName: preferPrimary(primary?.firstName, fallback.firstName),
    lastName: preferPrimary(primary?.lastName, fallback.lastName),
    email: preferPrimary(primary?.email, fallback.email),
    phone: preferPrimary(primary?.phone, fallback.phone),
    homeAddress: preferPrimary(primary?.homeAddress, fallback.homeAddress),
    homeCity: preferPrimary(primary?.homeCity, fallback.homeCity),
    homeState: preferPrimary(primary?.homeState, fallback.homeState),
    licenseNumber: preferPrimary(primary?.licenseNumber, fallback.licenseNumber),
    licenseState: preferPrimary(primary?.licenseState, fallback.licenseState),
    licenses: preferPrimary(primary?.licenses, fallback.licenses),
    specialties: preferPrimary(primary?.specialties, fallback.specialties),
    yearsNursingExperience: preferPrimary(
      primary?.yearsNursingExperience,
      fallback.yearsNursingExperience,
    ),
    compactLicenseStatus: preferPrimary(
      primary?.compactLicenseStatus,
      fallback.compactLicenseStatus,
    ),
    averagePatientRatios: preferPrimary(
      primary?.averagePatientRatios,
      fallback.averagePatientRatios,
    ),
    specializedMedicalEquipment: preferPrimary(
      primary?.specializedMedicalEquipment,
      fallback.specializedMedicalEquipment,
    ),
    education: preferPrimary(primary?.education, fallback.education),
    detectedCredentials: uniqueCerts,
    certificationDetails: certDetailsByName.size
      ? [...certDetailsByName.values()]
      : undefined,
    employers: preferPrimary(primary?.employers, fallback.employers),
    rawText: preferPrimary(primary?.rawText, fallback.rawText),
  }
}
