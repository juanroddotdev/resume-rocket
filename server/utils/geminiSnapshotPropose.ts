import { callGeminiWithRetry } from '~/server/utils/geminiErrors'
import {
  createGeminiClient,
  GEMINI_MODELS,
  PARSE_AUDIT_SNIPPET_MAX_CHARS,
} from '~/server/utils/geminiShared'
import { Type } from '@google/genai'
import {
  PROFESSIONAL_SNAPSHOT_KEYS,
  PROFESSIONAL_SNAPSHOT_LABELS,
  mapGeminiSnapshotProposals,
  type ProfessionalSnapshotKey,
  type SnapshotProposals,
} from '~/utils/professionalSnapshot'

export { mapGeminiSnapshotProposals }

function snapshotProposalJsonSchema() {
  const lineSchema = {
    type: Type.OBJECT,
    properties: {
      value: { type: Type.STRING },
      source_snippet: { type: Type.STRING },
    },
  }
  const properties: Record<string, unknown> = {}
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    properties[key] = lineSchema
  }
  return {
    type: Type.OBJECT,
    properties,
  }
}

type GeminiSnapshotProposeJson = Partial<
  Record<ProfessionalSnapshotKey, { value?: string; source_snippet?: string }>
>

const KEY_GUIDE = PROFESSIONAL_SNAPSHOT_KEYS.map(
  key => `- ${key} (${PROFESSIONAL_SNAPSHOT_LABELS[key]})`,
).join('\n')

export async function proposeProfessionalSnapshotWithGemini(
  rawText: string,
): Promise<SnapshotProposals> {
  const ai = createGeminiClient()
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

  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: snapshotProposalJsonSchema(),
          },
        }),
      )

      const text = response.text
      if (!text) throw new Error('Empty Gemini response')
      return mapGeminiSnapshotProposals(JSON.parse(text) as GeminiSnapshotProposeJson)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini snapshot propose failed')
}
