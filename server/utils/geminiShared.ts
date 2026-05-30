import { GoogleGenAI, Type } from '@google/genai'
import type { ParsedResume } from '~/types/parse'

export const GEMINI_PLACEHOLDER_KEYS = new Set([
  'your-gemini-api-key',
  'changeme',
])

export const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'] as const

/** PDFs with fewer chars than this after pdf-parse use Gemini document vision. */
export const MIN_EXTRACTED_TEXT_CHARS = 40

/** Shared field guide for text + vision Gemini parse prompts (Phase C / VMS manifest). */
export const GEMINI_VMS_FIELD_GUIDE = `Extract all fields you can find. Use empty strings, empty arrays, or omit keys when not present. Do not invent data.

Identity: first_name, last_name, email, phone, license_number, license_state
Clinical summary: specialties (units like ICU, ER, Med-Surg), years_nursing_experience, compact_license_status (Yes/No/N/A when stated), average_patient_ratios, specialized_medical_equipment
Education: education[] with degree, school, graduation_year
Certifications: certifications[] with name (BLS, ACLS, PALS, NIHSS, TNCC, CCRN) and optional expiry (YYYY-MM or readable date)
Employers (suggested_employers[]): name, role, city, state, start_date, end_date, employment_type, unit_bed_count, patient_scope, floated_units[], equipment_procedures[], avg_daily_patients, patient_acuity, highlights[]`

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
}

export type GeminiEducationJson = {
  degree?: string
  school?: string
  graduation_year?: string
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
}

export type GeminiResumeJson = {
  raw_resume_text?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  specialties?: string[]
  years_nursing_experience?: string
  compact_license_status?: string
  average_patient_ratios?: string
  specialized_medical_equipment?: string
  education?: GeminiEducationJson[]
  certifications?: GeminiCertificationJson[]
  suggested_employers?: GeminiEmployerJson[]
}

export function resumeJsonSchema(options?: { includeRawText?: boolean }) {
  const properties: Record<string, unknown> = {
    first_name: { type: Type.STRING },
    last_name: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    license_number: { type: Type.STRING },
    license_state: { type: Type.STRING },
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
          graduation_year: { type: Type.STRING },
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
        },
      },
    },
  }

  if (options?.includeRawText) {
    properties.raw_resume_text = { type: Type.STRING }
  }

  return {
    type: Type.OBJECT,
    properties,
  }
}

function mapGeminiEmployer(e: GeminiEmployerJson) {
  if (!e.name?.trim()) return null
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
    highlights: e.highlights?.filter(Boolean),
  }
}

export function mapGeminiResumeJson(
  parsed: GeminiResumeJson,
  rawTextFallback: string,
): ParsedResume {
  const rawText = (parsed.raw_resume_text || rawTextFallback).slice(0, 5000)

  const certificationDetails = parsed.certifications
    ?.map(c => ({
      name: c.name?.trim().toUpperCase() || '',
      expiry: c.expiry?.trim() || undefined,
    }))
    .filter(c => c.name)

  const detectedFromCerts = certificationDetails?.map(c => c.name)

  return {
    firstName: parsed.first_name?.trim() || undefined,
    lastName: parsed.last_name?.trim() || undefined,
    email: parsed.email?.trim() || undefined,
    phone: parsed.phone?.trim() || undefined,
    licenseNumber: parsed.license_number?.trim() || undefined,
    licenseState: parsed.license_state?.trim() || undefined,
    specialties: parsed.specialties?.map(s => s.trim()).filter(Boolean),
    yearsNursingExperience: parsed.years_nursing_experience?.trim() || undefined,
    compactLicenseStatus: parsed.compact_license_status?.trim() || undefined,
    averagePatientRatios: parsed.average_patient_ratios?.trim() || undefined,
    specializedMedicalEquipment: parsed.specialized_medical_equipment?.trim() || undefined,
    education: parsed.education
      ?.map(ed => ({
        degree: ed.degree?.trim() || undefined,
        school: ed.school?.trim() || undefined,
        graduationYear: ed.graduation_year?.trim() || undefined,
      }))
      .filter(ed => ed.degree || ed.school || ed.graduationYear),
    certificationDetails: certificationDetails?.length ? certificationDetails : undefined,
    detectedCredentials: detectedFromCerts?.length ? [...new Set(detectedFromCerts)] : undefined,
    employers: parsed.suggested_employers
      ?.map(mapGeminiEmployer)
      .filter((e): e is NonNullable<ReturnType<typeof mapGeminiEmployer>> => e !== null),
    rawText,
  }
}
