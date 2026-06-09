/** User-facing copy when Gemini is temporarily unavailable (503 / high demand). */
export const GEMINI_CAPACITY_PARSE_MESSAGE =
  'Our AI parser is busy right now. We used basic detection for anything we could read — please review your fields, try again in a few minutes, or continue manually.'

export const GEMINI_CAPACITY_VISION_MESSAGE =
  'Our AI scanner is busy right now. Please try again in a few minutes, or continue manually to enter your details.'

export type GeminiErrorDetails = {
  code?: number
  status?: string
  message: string
}

export function getGeminiErrorDetails(error: unknown): GeminiErrorDetails {
  if (error instanceof Error) {
    const trimmed = error.message.trim()
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as {
          error?: { code?: number; status?: string; message?: string }
        }
        if (parsed.error) {
          return {
            code: parsed.error.code,
            status: parsed.error.status,
            message: parsed.error.message?.trim() || trimmed,
          }
        }
      } catch {
        /* not JSON */
      }
    }
    return { message: error.message }
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as {
      error?: { code?: number; status?: string; message?: string }
      status?: number
      message?: string
    }
    if (record.error) {
      return {
        code: record.error.code,
        status: record.error.status,
        message: record.error.message?.trim() || 'Gemini error',
      }
    }
    return {
      code: record.status,
      message: record.message?.trim() || 'Gemini error',
    }
  }

  return { message: String(error) }
}

/** Transient overload / capacity errors — safe to retry and fall back to heuristics. */
export function isGeminiCapacityError(error: unknown): boolean {
  const { code, status, message } = getGeminiErrorDetails(error)
  if (code === 503 || code === 429 || code === 500) return true
  if (status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED') return true

  const m = message.toLowerCase()
  return (
    m.includes('high demand')
    || m.includes('try again later')
    || m.includes('overloaded')
    || m.includes('capacity')
    || m.includes('unavailable')
  )
}

export function userFacingGeminiError(error: unknown, context: 'text' | 'vision'): string {
  if (isGeminiCapacityError(error)) {
    return context === 'vision' ? GEMINI_CAPACITY_VISION_MESSAGE : GEMINI_CAPACITY_PARSE_MESSAGE
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return context === 'vision' ? 'AI scan failed' : 'AI parse failed'
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Retry generateContent on transient Gemini capacity errors (503 high demand, etc.). */
export async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3
  const baseDelayMs = options?.baseDelayMs ?? 1500
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isGeminiCapacityError(error) || attempt >= maxAttempts) break
      await sleep(baseDelayMs * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini request failed')
}
