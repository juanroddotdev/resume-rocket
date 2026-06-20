import { GoogleGenAI, Type } from '@google/genai'
import type { ParseAudit, ParsedResume } from '~/types/parse'
import {
  inferClinicalFlagsFromHighlights,
  resolveClinicalFlagFromParse,
} from '../../utils/employerClinicalFlags.ts'
import { resolveCanonicalCert } from '../../utils/certificationOptions.ts'
import {
  normalizeGraduationMonth,
  normalizeGraduationYear,
  splitLegacyGraduationValue,
} from '../../utils/educationGraduation.ts'
import { normalizeLicense } from '../../utils/licenseRows.ts'

export const GEMINI_PLACEHOLDER_KEYS = new Set([
  'your-gemini-api-key',
  'changeme',
])

export const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'] as const

/** PDFs with fewer chars than this after pdf-parse use Gemini document vision. */
export const MIN_EXTRACTED_TEXT_CHARS = 40

/** Max length for employer source_snippet in Gemini schema + stored audit. */
export const PARSE_AUDIT_SNIPPET_MAX_CHARS = 200

/** Shared field guide for text + vision Gemini parse prompts (Phase C / VMS manifest). */
export const GEMINI_VMS_FIELD_GUIDE = `Extract all fields you can find. Use empty strings, empty arrays, or omit keys when not present. Do not invent data.

Identity: first_name, last_name, email, phone, home_address, home_city, home_state, license_number, license_state, licenses[]
- home_address: full street address from resume header/contact block — not employer city
- home_city / home_state: candidate residence when stated separately from employers
- licenses[]: all active RN licenses when stated — each with state (2-letter US), number, optional expiry (MM/YYYY), source_snippet
- license_number / license_state: primary active RN license when multiple appear (first or most prominent)

Clinical summary: specialties (units like ICU, ER, Med-Surg), years_nursing_experience, compact_license_status (Yes/No/N/A when stated), average_patient_ratios, specialized_medical_equipment
- years_nursing_experience: total years of nursing experience as written (e.g. "8", "12+"); nursing roles only — do not count unrelated work history
- compact_license_status: "Yes" if resume mentions NLC, compact, multi-state, or eNLC; "No" if explicitly not compact; omit or "N/A" when unclear
- specialties: split comma, semicolon, slash, or bullet lists into separate array items; include unit types and clinical areas
- average_patient_ratios: as written (e.g. "1:4", "1:5-6")
- specialized_medical_equipment: equipment and advanced skills from summary/skills sections (ECMO, CRRT, ventilators, etc.)

Education: education[] with degree, school, graduation_month (01-12 or month name when stated), graduation_year (YYYY, or MM/YYYY when month and year are combined), source_snippet
- source_snippet: short verbatim excerpt supporting this education row (max ${PARSE_AUDIT_SNIPPET_MAX_CHARS} characters)

Certifications: certifications[] with name (standard acronym, e.g. BLS, ACLS, PALS, NRP, STABLE, CCRN, CEN, TNCC, ENPC, NIHSS, RRT, CRT, ARRT, RDMS, RDCS, RVT, RCIS, RCES, MLS, MLT, CST, CRCST, CPhT, CMA, CPI, MOAB, MAB, QMHP, PBT) and optional expiry (MM/YYYY, e.g. 06/2026), source_snippet
- Split combined cert lines into one object per certification
- source_snippet: short verbatim excerpt supporting this certification (max ${PARSE_AUDIT_SNIPPET_MAX_CHARS} characters)

Employers (suggested_employers[]): name, role, city, state, start_date, end_date, employment_type, unit_bed_count, patient_scope, floated_units[], equipment_procedures[], avg_daily_patients, patient_acuity, highlights[], charge_nurse_experience (boolean when stated), preceptor_experience (boolean when stated), source_snippet
- One object per hospital/facility assignment; split combined job blocks into separate employers when dates or facilities differ
- name: facility or hospital name as on the resume
- source_snippet: short verbatim excerpt from the resume supporting this employer (max ${PARSE_AUDIT_SNIPPET_MAX_CHARS} characters); QA evidence only — do not include beds/trauma/teaching here
- Do NOT put hospital-wide bed counts, trauma level, teaching status, or facility type on suggested_employers — those are filled from our facility database after the candidate links the hospital
- unit_bed_count: ONLY the nursing unit bed count when explicitly stated (e.g. "24-bed ICU", "36-bed Med-Surg"); NEVER use hospital-wide or facility total beds (e.g. "450-bed hospital" → leave unit_bed_count empty)
- employment_type: Travel, Staff, Per Diem, Contract, etc. when stated
- floated_units[]: other units floated to at this employer
- equipment_procedures[]: unit-specific equipment or procedures for this job
- highlights[]: short bullet achievements for this assignment only

Parse audit (server QA only — not shown to candidates):
- identified_facilities_raw: every distinct hospital/facility name string found on the resume, as written
- Do not invent facility metrics (beds, trauma, teaching) anywhere in the response`

const stringArraySchema = {
  type: Type.ARRAY,
  items: { type: Type.STRING },
}

export function isGeminiConfigured(apiKey: string | undefined): boolean {
  const trimmed = apiKey?.trim()
  if (!trimmed) return false
  return !GEMINI_PLACEHOLDER_KEYS.has(trimmed.toLowerCase())
}

export function createGeminiClient() {
  const config = useRuntimeConfig()
  if (!isGeminiConfigured(config.geminiApiKey)) {
    throw new Error('Gemini is not configured')
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey })
}

export type GeminiCertificationJson = {
  name?: string
  expiry?: string
  source_snippet?: string
}

export type GeminiEducationJson = {
  degree?: string
  school?: string
  graduation_month?: string
  graduation_year?: string
  source_snippet?: string
}

export type GeminiEmployerJson = {
  name?: string
  role?: string
  city?: string
  state?: string
  start_date?: string
  end_date?: string
  employment_type?: string
  unit_bed_count?: string
  patient_scope?: string
  floated_units?: string[]
  equipment_procedures?: string[]
  avg_daily_patients?: string
  patient_acuity?: string
  highlights?: string[]
  charge_nurse_experience?: boolean
  preceptor_experience?: boolean
  source_snippet?: string
}

export type GeminiLicenseJson = {
  state?: string
  number?: string
  expiry?: string
  source_snippet?: string
}

export type GeminiResumeJson = {
  raw_resume_text?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  home_address?: string
  home_city?: string
  home_state?: string
  license_number?: string
  license_state?: string
  licenses?: GeminiLicenseJson[]
  specialties?: string[]
  years_nursing_experience?: string
  compact_license_status?: string
  average_patient_ratios?: string
  specialized_medical_equipment?: string
  education?: GeminiEducationJson[]
  certifications?: GeminiCertificationJson[]
  suggested_employers?: GeminiEmployerJson[]
  identified_facilities_raw?: string[]
}

export type GeminiParseMapResult = {
  resume: ParsedResume
  audit: ParseAudit | null
}

export function resumeJsonSchema(options?: { includeRawText?: boolean }) {
  const properties: Record<string, unknown> = {
    first_name: { type: Type.STRING },
    last_name: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    home_address: { type: Type.STRING },
    home_city: { type: Type.STRING },
    home_state: { type: Type.STRING },
    license_number: { type: Type.STRING },
    license_state: { type: Type.STRING },
    licenses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          state: { type: Type.STRING },
          number: { type: Type.STRING },
          expiry: { type: Type.STRING },
          source_snippet: { type: Type.STRING },
        },
      },
    },
    specialties: stringArraySchema,
    years_nursing_experience: { type: Type.STRING },
    compact_license_status: { type: Type.STRING },
    average_patient_ratios: { type: Type.STRING },
    specialized_medical_equipment: { type: Type.STRING },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          school: { type: Type.STRING },
          graduation_month: { type: Type.STRING },
          graduation_year: { type: Type.STRING },
          source_snippet: { type: Type.STRING },
        },
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          expiry: { type: Type.STRING },
          source_snippet: { type: Type.STRING },
        },
      },
    },
    suggested_employers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          city: { type: Type.STRING },
          state: { type: Type.STRING },
          start_date: { type: Type.STRING },
          end_date: { type: Type.STRING },
          employment_type: { type: Type.STRING },
          unit_bed_count: { type: Type.STRING },
          patient_scope: { type: Type.STRING },
          floated_units: stringArraySchema,
          equipment_procedures: stringArraySchema,
          avg_daily_patients: { type: Type.STRING },
          patient_acuity: { type: Type.STRING },
          highlights: stringArraySchema,
          charge_nurse_experience: { type: Type.BOOLEAN },
          preceptor_experience: { type: Type.BOOLEAN },
          source_snippet: { type: Type.STRING },
        },
      },
    },
    identified_facilities_raw: stringArraySchema,
  }

  if (options?.includeRawText) {
    properties.raw_resume_text = { type: Type.STRING }
  }

  return {
    type: Type.OBJECT,
    properties,
  }
}

function truncateAuditSnippet(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, PARSE_AUDIT_SNIPPET_MAX_CHARS)
}

function mapAuditEntry<T extends { sourceSnippet?: string }>(
  entry: T | null,
  sourceSnippet?: string,
): T | null {
  if (!entry) return null
  const snippet = truncateAuditSnippet(sourceSnippet)
  return snippet ? { ...entry, sourceSnippet: snippet } : entry
}

/** Build server-only audit payload; strips before intake API response. */
export function buildParseAudit(parsed: GeminiResumeJson): ParseAudit | null {
  const identifiedFacilitiesRaw = parsed.identified_facilities_raw
    ?.map(name => name.trim())
    .filter(Boolean)

  const suggestedEmployers = parsed.suggested_employers
    ?.map((employer) => {
      const name = employer.name?.trim()
      if (!name) return null
      return mapAuditEntry({ name }, employer.source_snippet)
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const suggestedCertifications = parsed.certifications
    ?.map((cert) => {
      const name = resolveCanonicalCert(cert.name?.trim()) ?? cert.name?.trim().toUpperCase()
      if (!name) return null
      const expiry = cert.expiry?.trim() || undefined
      return mapAuditEntry({ name, ...(expiry ? { expiry } : {}) }, cert.source_snippet)
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const suggestedLicenses = parsed.licenses
    ?.map((license) => {
      const normalized = mapGeminiLicense(license)
      if (!normalized) return null
      const entry = {
        ...(normalized.state ? { state: normalized.state } : {}),
        ...(normalized.number ? { number: normalized.number } : {}),
        ...(normalized.expiry ? { expiry: normalized.expiry } : {}),
      }
      if (!entry.state && !entry.number && !entry.expiry) return null
      return mapAuditEntry(entry, license.source_snippet)
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const suggestedEducation = parsed.education
    ?.map((education) => {
      const mapped = mapGeminiEducation(education)
      if (!mapped) return null
      const entry = {
        ...(mapped.degree ? { degree: mapped.degree } : {}),
        ...(mapped.school ? { school: mapped.school } : {}),
      }
      if (!entry.degree && !entry.school) return null
      return mapAuditEntry(entry, education.source_snippet)
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const hasContent = Boolean(
    identifiedFacilitiesRaw?.length
    || suggestedEmployers?.length
    || suggestedCertifications?.length
    || suggestedLicenses?.length
    || suggestedEducation?.length,
  )

  if (!hasContent) {
    return null
  }

  return {
    ...(identifiedFacilitiesRaw?.length ? { identifiedFacilitiesRaw } : {}),
    ...(suggestedEmployers?.length ? { suggestedEmployers } : {}),
    ...(suggestedCertifications?.length ? { suggestedCertifications } : {}),
    ...(suggestedLicenses?.length ? { suggestedLicenses } : {}),
    ...(suggestedEducation?.length ? { suggestedEducation } : {}),
    capturedAt: new Date().toISOString(),
  }
}

function mapGeminiEducation(ed: GeminiEducationJson) {
  const degree = ed.degree?.trim() || undefined
  const school = ed.school?.trim() || undefined
  let graduationMonth = normalizeGraduationMonth(ed.graduation_month)
  let graduationYear = normalizeGraduationYear(ed.graduation_year)
  if (!graduationMonth && ed.graduation_year?.trim()) {
    const legacy = splitLegacyGraduationValue(ed.graduation_year)
    graduationMonth = legacy.graduationMonth ?? graduationMonth
    graduationYear = legacy.graduationYear ?? graduationYear
  }
  if (!degree && !school && !graduationYear && !graduationMonth) return null
  return {
    degree,
    school,
    graduationMonth,
    graduationYear,
  }
}

function mapGeminiLicense(license: GeminiLicenseJson) {
  return normalizeLicense({
    state: license.state,
    number: license.number,
    expiry: license.expiry,
  })
}

function mapGeminiEmployer(e: GeminiEmployerJson) {
  if (!e.name?.trim()) return null
  const highlights = e.highlights?.filter(Boolean)
  const inferred = inferClinicalFlagsFromHighlights(highlights)
  return {
    name: e.name.trim(),
    role: e.role?.trim() || undefined,
    city: e.city?.trim() || undefined,
    state: e.state?.trim() || undefined,
    startDate: e.start_date?.trim() || undefined,
    endDate: e.end_date?.trim() || undefined,
    employmentType: e.employment_type?.trim() || undefined,
    unitBedCount: e.unit_bed_count?.trim() || undefined,
    patientScope: e.patient_scope?.trim() || undefined,
    floatedUnits: e.floated_units?.filter(Boolean),
    equipmentProcedures: e.equipment_procedures?.filter(Boolean),
    avgDailyPatients: e.avg_daily_patients?.trim() || undefined,
    patientAcuity: e.patient_acuity?.trim() || undefined,
    highlights,
    chargeNurseExperience: resolveClinicalFlagFromParse(
      e.charge_nurse_experience,
      inferred.chargeNurseExperience,
    ),
    preceptorExperience: resolveClinicalFlagFromParse(
      e.preceptor_experience,
      inferred.preceptorExperience,
    ),
  }
}

export function mapGeminiResumeJson(
  parsed: GeminiResumeJson,
  rawTextFallback: string,
): GeminiParseMapResult {
  const rawText = (parsed.raw_resume_text || rawTextFallback).slice(0, 5000)

  const certificationDetails = parsed.certifications
    ?.map((c) => {
      const name = resolveCanonicalCert(c.name?.trim()) ?? c.name?.trim().toUpperCase()
      if (!name) return null
      return {
        name,
        expiry: c.expiry?.trim() || undefined,
      }
    })
    .filter((c): c is { name: string, expiry: string | undefined } => c !== null)

  const detectedFromCerts = certificationDetails?.map(c => c.name)
  const licenses = parsed.licenses
    ?.map(mapGeminiLicense)
    .filter((row): row is NonNullable<ReturnType<typeof mapGeminiLicense>> => row !== null)

  return {
    resume: {
      firstName: parsed.first_name?.trim() || undefined,
      lastName: parsed.last_name?.trim() || undefined,
      email: parsed.email?.trim() || undefined,
      phone: parsed.phone?.trim() || undefined,
      homeAddress: parsed.home_address?.trim() || undefined,
      homeCity: parsed.home_city?.trim() || undefined,
      homeState: parsed.home_state?.trim() || undefined,
      licenseNumber: parsed.license_number?.trim() || licenses?.[0]?.number || undefined,
      licenseState: parsed.license_state?.trim() || licenses?.[0]?.state || undefined,
      licenses: licenses?.length ? licenses : undefined,
      specialties: parsed.specialties?.map(s => s.trim()).filter(Boolean),
      yearsNursingExperience: parsed.years_nursing_experience?.trim() || undefined,
      compactLicenseStatus: parsed.compact_license_status?.trim() || undefined,
      averagePatientRatios: parsed.average_patient_ratios?.trim() || undefined,
      specializedMedicalEquipment: parsed.specialized_medical_equipment?.trim() || undefined,
      education: parsed.education
        ?.map(mapGeminiEducation)
        .filter((ed): ed is NonNullable<ReturnType<typeof mapGeminiEducation>> => ed !== null),
      certificationDetails: certificationDetails?.length ? certificationDetails : undefined,
      detectedCredentials: detectedFromCerts?.length ? [...new Set(detectedFromCerts)] : undefined,
      employers: parsed.suggested_employers
        ?.map(mapGeminiEmployer)
        .filter((e): e is NonNullable<ReturnType<typeof mapGeminiEmployer>> => e !== null),
      rawText,
    },
    audit: buildParseAudit(parsed),
  }
}
