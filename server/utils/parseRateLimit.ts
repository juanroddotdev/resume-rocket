interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export interface ParseRateLimitOptions {
  max: number
  windowMs: number
}

export interface ParseRateLimitResult {
  allowed: boolean
  retryAfterSec?: number
}

export function checkParseRateLimit(
  token: string,
  options: ParseRateLimitOptions,
): ParseRateLimitResult {
  const now = Date.now()
  let entry = store.get(token)

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + options.windowMs }
    store.set(token, entry)
  }

  if (entry.count >= options.max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  entry.count++
  return { allowed: true }
}

/** Test helper — clears in-memory counters between test runs. */
export function resetParseRateLimitStore() {
  store.clear()
}
