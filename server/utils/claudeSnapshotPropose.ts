import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { callClaudeWithRetry } from '~/server/utils/claudeErrors'
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  CLAUDE_MODELS,
  PARSE_AUDIT_SNIPPET_MAX_CHARS,
  createClaudeClient,
  type ClaudeJsonObjectSchema,
} from '~/server/utils/claudeShared'
import {
  PROFESSIONAL_SNAPSHOT_KEYS,
  PROFESSIONAL_SNAPSHOT_LABELS,
  type ProfessionalSnapshotKey,
  type SnapshotProposals,
} from '~/utils/professionalSnapshot'

const SNAPSHOT_PROPOSAL_SNIPPET_MAX = 200

function mapClaudeSnapshotProposals(
  raw: Partial<
    Record<ProfessionalSnapshotKey, { value?: string, source_snippet?: string }>
  >,
): SnapshotProposals {
  const out: SnapshotProposals = {}
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    const entry = raw[key]
    const value = entry?.value?.trim()
    if (!value) continue
    const snippet = entry?.source_snippet?.trim()
    out[key] = {
      value,
      source: 'claude',
      ...(snippet
        ? { sourceSnippet: snippet.slice(0, SNAPSHOT_PROPOSAL_SNIPPET_MAX) }
        : {}),
    }
  }
  return out
}

function claudeSnapshotProposalJsonSchema(): ClaudeJsonObjectSchema {
  const lineSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      value: { type: 'string' },
      source_snippet: { type: 'string' },
    },
  }
  const properties: Record<string, unknown> = {}
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    properties[key] = lineSchema
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties,
  }
}

type ClaudeSnapshotProposeJson = Partial<
  Record<ProfessionalSnapshotKey, { value?: string, source_snippet?: string }>
>

const KEY_GUIDE = PROFESSIONAL_SNAPSHOT_KEYS.map(
  key => `- ${key} (${PROFESSIONAL_SNAPSHOT_LABELS[key]})`,
).join('\n')

export async function proposeProfessionalSnapshotWithClaude(
  rawText: string,
): Promise<SnapshotProposals> {
  const client = createClaudeClient()
  let lastError: unknown

  const prompt = `You are helping a healthcare staffing recruiter fill a Professional Snapshot section for a VMS nursing resume packet.

From the resume text, propose concise values for these snapshot lines when evidence exists. Prefer short phrase values (e.g. "Yes", "Yes — 2 travel contracts", "Level I & II", "Epic", specialty names).

For each line you fill, include source_snippet: a short verbatim excerpt from the resume (max ${PARSE_AUDIT_SNIPPET_MAX_CHARS} characters) supporting the value.

Keys:
${KEY_GUIDE}

Rules:
- Do not invent data. Omit keys with no support in the resume.
- snapshot_magnet_facility_experience: only when Magnet / ANCC Magnet / Magnet Recognition is stated.
- Travel / charge / preceptor / teaching / float: only when clearly stated.
- Trauma: trauma center levels mentioned (e.g. Level I).
- Years / specialty / EMR / ratios / equipment: from summary or experience when stated.

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
            format: jsonSchemaOutputFormat(claudeSnapshotProposalJsonSchema()),
          },
        }),
      )

      const parsedOutput = response.parsed_output as ClaudeSnapshotProposeJson | null
      if (!parsedOutput) throw new Error('Empty Claude response')
      return mapClaudeSnapshotProposals(parsedOutput)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Claude snapshot propose failed')
}
