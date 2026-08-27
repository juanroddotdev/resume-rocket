/** User-facing copy when Claude is temporarily unavailable (rate limit / overload). */
export const CLAUDE_CAPACITY_PARSE_MESSAGE =
  'Our AI parser is busy right now. We used basic detection for anything we could read — please review your fields, try again in a few minutes, or continue manually.'

export const CLAUDE_CAPACITY_VISION_MESSAGE =
  'Our AI scanner is busy right now. Please try again in a few minutes, or continue manually to enter your details.'

export const CLAUDE_GENERIC_PARSE_MESSAGE =
  'AI parse failed. We used basic detection where possible — please review your fields, try again, or continue manually.'

export const CLAUDE_GENERIC_VISION_MESSAGE =
  'AI scan failed. Please try again, or continue manually to enter your details.'

export type ClaudeErrorDetails = {
  code?: string
  status?: number
  type?: string
  message: string
}

export function getClaudeErrorDetails(error: unknown): ClaudeErrorDetails {
  if (error instanceof Error) {
    const record = error as Error & {
      status?: number
      error?: { type?: string, message?: string }
    }
    return {
      status: record.status,
      type: record.error?.type,
      code: record.error?.type,
      message: record.error?.message?.trim() || error.message,
    }
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as {
      status?: number
      type?: string
      code?: string
      message?: string
      error?: { type?: string, message?: string }
    }
    return {
      status: record.status,
      type: record.error?.type || record.type,
      code: record.code || record.error?.type,
      message: record.error?.message?.trim() || record.message?.trim() || 'Claude error',
    }
  }

  return { message: String(error) }
}

/** Transient overload / capacity errors — safe to retry and fall back to heuristics. */
export function isClaudeCapacityError(error: unknown): boolean {
  const { status, type, code, message } = getClaudeErrorDetails(error)
  if (status === 429 || status === 500 || status === 503 || status === 529) return true
  if (type === 'rate_limit_error' || type === 'overloaded_error' || type === 'api_error') return true
  if (code === 'rate_limit_error' || code === 'overloaded_error' || code === 'api_error') return true

  const m = message.toLowerCase()
  return (
    m.includes('overloaded')
    || m.includes('rate limit')
    || m.includes('too many requests')
    || m.includes('try again later')
    || m.includes('capacity')
    || m.includes('unavailable')
  )
}

export function userFacingClaudeError(error: unknown, context: 'text' | 'vision'): string {
  if (isClaudeCapacityError(error)) {
    return context === 'vision' ? CLAUDE_CAPACITY_VISION_MESSAGE : CLAUDE_CAPACITY_PARSE_MESSAGE
  }
  return context === 'vision' ? CLAUDE_GENERIC_VISION_MESSAGE : CLAUDE_GENERIC_PARSE_MESSAGE
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Retry Claude calls on transient capacity errors. */
export async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number, baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3
  const baseDelayMs = options?.baseDelayMs ?? 1500
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isClaudeCapacityError(error) || attempt >= maxAttempts) break
      await sleep(baseDelayMs * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Claude request failed')
}
