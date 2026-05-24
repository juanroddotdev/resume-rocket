import { GoogleGenAI, Type } from '@google/genai'
import type { ParsedResume } from '~/types/parse'

export const GEMINI_PLACEHOLDER_KEYS = new Set([
  'your-gemini-api-key',
  'changeme',
])

export const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'] as const

/** PDFs with fewer chars than this after pdf-parse use Gemini document vision. */
export const MIN_EXTRACTED_TEXT_CHARS = 40

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

export type GeminiResumeJson = {
  raw_resume_text?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  specialties?: string[]
  suggested_employers?: Array<{
    name: string
    role?: string
    city?: string
    state?: string
  }>
}

export function resumeJsonSchema(options?: { includeRawText?: boolean }) {
  const properties: Record<string, unknown> = {
    first_name: { type: Type.STRING },
    last_name: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    license_number: { type: Type.STRING },
    license_state: { type: Type.STRING },
    specialties: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
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

export function mapGeminiResumeJson(
  parsed: GeminiResumeJson,
  rawTextFallback: string,
): ParsedResume {
  const rawText = (parsed.raw_resume_text || rawTextFallback).slice(0, 5000)

  return {
    firstName: parsed.first_name,
    lastName: parsed.last_name,
    email: parsed.email,
    phone: parsed.phone,
    licenseNumber: parsed.license_number,
    licenseState: parsed.license_state,
    specialties: parsed.specialties,
    employers: parsed.suggested_employers?.map(e => ({
      name: e.name,
      role: e.role,
      city: e.city,
      state: e.state,
    })),
    rawText,
  }
}
