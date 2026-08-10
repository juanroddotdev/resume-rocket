import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { callClaudeWithRetry } from '~/server/utils/claudeErrors'
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  CLAUDE_MODELS,
  CLAUDE_VMS_FIELD_GUIDE,
  claudeResumeJsonSchema,
  createClaudeClient,
  isClaudeConfigured,
  mapClaudeResumeJson,
  type ClaudeParseMapResult,
  type ClaudeResumeJson,
} from '~/server/utils/claudeShared'

export async function parseResumeWithClaudeDocument(
  buffer: Buffer,
  mime: string,
): Promise<ClaudeParseMapResult> {
  if (!isClaudeConfigured(useRuntimeConfig().anthropicApiKey)) {
    throw new Error('Claude is not configured')
  }

  if (mime !== 'application/pdf') {
    throw new Error('Claude document parsing currently supports PDF resumes only')
  }

  const client = createClaudeClient()
  const prompt = `You are an expert ATS and VMS resume parser for healthcare nursing resumes.
This PDF may be image-based or use decorative layout (Canva, colored templates, etc.).
Read the entire document visually and extract:
1. raw_resume_text — plain text of all readable content (names, contact info, jobs, skills, licenses), in reading order.
2. Structured VMS fields:

${CLAUDE_VMS_FIELD_GUIDE}`

  let lastError: unknown

  for (const modelName of CLAUDE_MODELS) {
    try {
      const response = await callClaudeWithRetry(() =>
        client.messages.parse({
          model: modelName,
          max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: buffer.toString('base64'),
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
          output_config: {
            format: jsonSchemaOutputFormat(claudeResumeJsonSchema({ includeRawText: true })),
          },
        }),
      )

      const parsedOutput = response.parsed_output as ClaudeResumeJson | null
      if (!parsedOutput) throw new Error('Empty Claude response')
      return mapClaudeResumeJson(parsedOutput, '')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Claude document parse failed')
}
