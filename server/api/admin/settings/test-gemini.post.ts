import { createGeminiClient, isGeminiConfigured } from '~/server/utils/geminiShared'
import { getAppSettings } from '~/server/utils/adminSettings'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const config = useRuntimeConfig()
  if (!isGeminiConfigured(config.geminiApiKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Gemini is not configured.',
    })
  }

  const settings = await getAppSettings()
  const ai = createGeminiClient()

  try {
    await ai.models.generateContent({
      model: settings.gemini_model,
      contents: 'Reply with OK.',
      config: {
        maxOutputTokens: 5,
      },
    })
    return {
      ok: true,
      message: 'Gemini connection succeeded.',
      model: settings.gemini_model,
    }
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Gemini connection failed. Check the server API key and selected model.',
    })
  }
})
