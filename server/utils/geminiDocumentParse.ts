import type { ParsedResume } from '~/types/parse'
import {
  createGeminiClient,
  GEMINI_MODELS,
  isGeminiConfigured,
  mapGeminiResumeJson,
  MIN_EXTRACTED_TEXT_CHARS,
  resumeJsonSchema,
  type GeminiResumeJson,
} from '~/server/utils/geminiShared'

export function needsDocumentVision(
  rawText: string,
  mime: string,
  filename: string,
): boolean {
  const isPdf =
    mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  return isPdf && rawText.trim().length < MIN_EXTRACTED_TEXT_CHARS
}

export async function parseResumeWithGeminiDocument(
  buffer: Buffer,
  mime: string,
): Promise<ParsedResume> {
  if (!isGeminiConfigured(useRuntimeConfig().geminiApiKey)) {
    throw new Error('Gemini is not configured')
  }

  const ai = createGeminiClient()
  const prompt = `You are an expert ATS and VMS resume parser for healthcare nursing resumes.
This PDF may be image-based or use decorative layout (Canva, colored templates, etc.).
Read the entire document visually and extract:
1. raw_resume_text — plain text of all readable content (names, contact info, jobs, skills, licenses), in reading order.
2. Structured fields: first_name, last_name, email, phone, license_number, license_state, specialties (clinical units like ICU, ER, Med-Surg), suggested_employers (hospitals/facilities with name, role, city, state when present).

Use empty strings or omit fields you cannot find. Do not invent data.`

  let lastError: unknown

  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: mime === 'application/pdf' ? 'application/pdf' : mime,
              data: buffer.toString('base64'),
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: resumeJsonSchema({ includeRawText: true }),
        },
      })

      const text = response.text
      if (!text) throw new Error('Empty Gemini response')
      return mapGeminiResumeJson(JSON.parse(text) as GeminiResumeJson, '')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini document parse failed')
}
