import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { callClaudeWithRetry } from '~/server/utils/claudeErrors'
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  CLAUDE_MODELS,
  CLAUDE_VMS_FIELD_GUIDE,
  claudeResumeJsonSchema,
  createClaudeClient,
  mapClaudeResumeJson,
  type ClaudeParseMapResult,
  type ClaudeResumeJson,
} from '~/server/utils/claudeShared'

export async function parseResumeWithClaude(rawText: string): Promise<ClaudeParseMapResult> {
  const client = createClaudeClient()
  let lastError: unknown

  const prompt = `You are an expert ATS and VMS resume parser for healthcare nursing resumes.
Extract structured fields from this resume text for a healthcare staffing VMS placement packet.

${CLAUDE_VMS_FIELD_GUIDE}

Resume text:
${rawText.slice(0, 12000)}`

  for (const modelName of CLAUDE_MODELS) {
    try {
      const response = await callClaudeWithRetry(() =>
        client.messages.parse({
          model: modelName,
          max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
          messages: [{ role: 'user', content: prompt }],
          output_config: {
            format: jsonSchemaOutputFormat(claudeResumeJsonSchema()),
          },
        }),
      )

      const parsedOutput = response.parsed_output as ClaudeResumeJson | null
      if (!parsedOutput) throw new Error('Empty Claude response')
      return mapClaudeResumeJson(parsedOutput, rawText)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Claude parse failed')
}
