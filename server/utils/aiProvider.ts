import type { ParseAudit, ParsedResume } from '~/types/parse'
import type { SnapshotProposals } from '~/utils/professionalSnapshot'

export type AiProviderName = 'gemini' | 'claude'

export type AiParseMapResult = {
  resume: ParsedResume
  audit: ParseAudit | null
}

type AiProviderRuntimeConfig = {
  aiProvider?: string
  geminiApiKey?: string
  anthropicApiKey?: string
}

export function normalizeAiProviderName(rawProvider: unknown): AiProviderName | null {
  if (typeof rawProvider !== 'string') return null
  const normalized = rawProvider.trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'gemini' || normalized === 'claude') return normalized
  throw new Error(`Unsupported AI_PROVIDER "${rawProvider}". Use "gemini" or "claude".`)
}

export function inferAiProviderName(input: {
  rawProvider?: unknown
  geminiConfigured: boolean
  claudeConfigured: boolean
}): AiProviderName {
  const explicitProvider = normalizeAiProviderName(input.rawProvider)
  if (explicitProvider) return explicitProvider
  if (input.geminiConfigured) return 'gemini'
  if (input.claudeConfigured) return 'claude'
  return 'gemini'
}

export function resolveAiProviderName(config: AiProviderRuntimeConfig = useRuntimeConfig()): AiProviderName {
  return inferAiProviderName({
    rawProvider: config.aiProvider,
    geminiConfigured: isGeminiConfigured(config.geminiApiKey),
    claudeConfigured: isClaudeConfigured(config.anthropicApiKey),
  })
}

export function isAiProviderConfigured(
  provider: AiProviderName,
  config: AiProviderRuntimeConfig = useRuntimeConfig(),
): boolean {
  return provider === 'claude'
    ? isClaudeConfigured(config.anthropicApiKey)
    : isGeminiConfigured(config.geminiApiKey)
}

export function aiProviderApiKeyName(provider: AiProviderName): string {
  return provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'
}

export function aiProviderDisplayName(provider: AiProviderName): string {
  return provider === 'claude' ? 'Claude' : 'Gemini'
}

export async function parseResumeWithAi(rawText: string): Promise<AiParseMapResult> {
  const provider = resolveAiProviderName()
  return provider === 'claude'
    ? parseResumeWithClaude(rawText)
    : parseResumeWithGemini(rawText)
}

export async function parseResumeDocumentWithAi(
  buffer: Buffer,
  mime: string,
): Promise<AiParseMapResult> {
  const provider = resolveAiProviderName()
  return provider === 'claude'
    ? parseResumeWithClaudeDocument(buffer, mime)
    : parseResumeWithGeminiDocument(buffer, mime)
}

export async function proposeProfessionalSnapshotWithAi(
  rawText: string,
): Promise<SnapshotProposals> {
  const provider = resolveAiProviderName()
  return provider === 'claude'
    ? proposeProfessionalSnapshotWithClaude(rawText)
    : proposeProfessionalSnapshotWithGemini(rawText)
}

export function userFacingAiError(
  error: unknown,
  context: 'text' | 'vision',
  provider: AiProviderName = resolveAiProviderName(),
): string {
  return provider === 'claude'
    ? userFacingClaudeError(error, context)
    : userFacingGeminiError(error, context)
}
