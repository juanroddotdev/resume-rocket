import type { ParsedResume } from '~/types/parse'
import {
  createGeminiClient,
  GEMINI_MODELS,
  mapGeminiResumeJson,
  resumeJsonSchema,
  type GeminiResumeJson,
} from '~/server/utils/geminiShared'

export async function parseResumeWithGemini(rawText: string): Promise<ParsedResume> {
  const ai = createGeminiClient()
  let lastError: unknown

  const prompt = `You are an expert ATS and VMS resume parser for healthcare nursing resumes.
Extract structured fields from this resume text.
Return JSON with first_name, last_name, email, phone, license_number, license_state, specialties (clinical units like ICU, ER, Med-Surg), and suggested_employers (hospitals/facilities with name, role, city, state when present).
Use empty strings or omit fields you cannot find. Do not invent data.

Resume text:
${rawText.slice(0, 12000)}`

  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: resumeJsonSchema(),
        },
      })

      const text = response.text
      if (!text) throw new Error('Empty Gemini response')
      return mapGeminiResumeJson(JSON.parse(text) as GeminiResumeJson, rawText)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini parse failed')
}

export { isGeminiConfigured } from '~/server/utils/geminiShared'
