import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import {
  checkParseRateLimit,
  resetParseRateLimitStore,
} from '../server/utils/parseRateLimit.ts'

const OPTIONS = { max: 3, windowMs: 60_000 }

describe('checkParseRateLimit', () => {
  beforeEach(() => resetParseRateLimitStore())

  it('allows requests under the limit', () => {
    assert.equal(checkParseRateLimit('token-a', OPTIONS).allowed, true)
    assert.equal(checkParseRateLimit('token-a', OPTIONS).allowed, true)
    assert.equal(checkParseRateLimit('token-a', OPTIONS).allowed, true)
  })

  it('blocks when limit exceeded and returns retryAfterSec', () => {
    checkParseRateLimit('token-b', OPTIONS)
    checkParseRateLimit('token-b', OPTIONS)
    checkParseRateLimit('token-b', OPTIONS)
    const blocked = checkParseRateLimit('token-b', OPTIONS)
    assert.equal(blocked.allowed, false)
    assert.ok(blocked.retryAfterSec && blocked.retryAfterSec > 0)
  })

  it('tracks limits per invite token', () => {
    checkParseRateLimit('token-c', OPTIONS)
    checkParseRateLimit('token-c', OPTIONS)
    checkParseRateLimit('token-c', OPTIONS)
    assert.equal(checkParseRateLimit('token-c', OPTIONS).allowed, false)
    assert.equal(checkParseRateLimit('token-d', OPTIONS).allowed, true)
  })
})
