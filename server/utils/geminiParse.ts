import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { ParsedResume } from '~/types/parse'

export async function parseResumeWithGemini(rawText: string): Promise<ParsedResume> {
  const config = useRuntimeConfig()
  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GEMINI_API_KEY is not configured',
    })
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          first_name: { type: SchemaType.STRING },
          last_name: { type: SchemaType.STRING },
          email: { type: SchemaType.STRING },
          phone: { type: SchemaType.STRING },
          license_number: { type: SchemaType.STRING },
          license_state: { type: SchemaType.STRING },
          specialties: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          suggested_employers: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                role: { type: SchemaType.STRING },
                city: { type: SchemaType.STRING },
                state: { type: SchemaType.STRING },
              },
            },
          },
        },
      },
    },
  })

  const prompt = `Extract structured healthcare resume fields from this text. Return JSON only.

Resume text:
${rawText.slice(0, 12000)}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const parsed = JSON.parse(text) as {
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
    rawText: rawText.slice(0, 5000),
  }
}
