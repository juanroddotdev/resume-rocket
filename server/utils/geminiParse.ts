import type { ParsedResume } from '~/types/parse'
import {
  createGeminiClient,
  GEMINI_MODELS,
  GEMINI_VMS_FIELD_GUIDE,
  mapGeminiResumeJson,
  resumeJsonSchema,
  type GeminiResumeJson,
} from '~/server/utils/geminiShared'

export async function parseResumeWithGemini(rawText: string): Promise<ParsedResume> {
  const ai = createGeminiClient()
  let lastError: unknown

  const prompt = `You are an expert ATS and VMS resume parser for healthcare nursing resumes.
Extract structured fields from this resume text for a healthcare staffing VMS placement packet.

${GEMINI_VMS_FIELD_GUIDE}

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
