import { callGeminiWithRetry } from '~/server/utils/geminiErrors'
import {
  createGeminiClient,
  GEMINI_MODELS,
  GEMINI_VMS_FIELD_GUIDE,
  isGeminiConfigured,
  mapGeminiResumeJson,
  MIN_EXTRACTED_TEXT_CHARS,
  resumeJsonSchema,
  type GeminiParseMapResult,
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
): Promise<GeminiParseMapResult> {
  if (!isGeminiConfigured(useRuntimeConfig().geminiApiKey)) {
    throw new Error('Gemini is not configured')
  }

  const ai = createGeminiClient()
  const prompt = `You are an expert ATS and VMS resume parser for healthcare nursing resumes.
This PDF may be image-based or use decorative layout (Canva, colored templates, etc.).
Read the entire document visually and extract:
1. raw_resume_text — plain text of all readable content (names, contact info, jobs, skills, licenses), in reading order.
2. Structured VMS fields:

${GEMINI_VMS_FIELD_GUIDE}`

  let lastError: unknown

  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
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
        }),
      )

      const text = response.text
      if (!text) throw new Error('Empty Gemini response')
      return mapGeminiResumeJson(JSON.parse(text) as GeminiResumeJson, '')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini document parse failed')
}
