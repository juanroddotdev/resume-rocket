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
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash']
  let lastError: unknown

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
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

      const prompt = `Extract structured healthcare resume fields from this nursing/clinical resume text.
Return JSON with first_name, last_name, email, phone, license_number, license_state, specialties (clinical units like ICU, ER, Med-Surg), and suggested_employers (hospitals/facilities with name, role, city, state when present).
Use empty strings or omit fields you cannot find. Do not invent data.

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
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini parse failed')
}
