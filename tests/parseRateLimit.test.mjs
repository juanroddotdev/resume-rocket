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

  it('treats empty-string token as its own bucket', () => {
    assert.equal(checkParseRateLimit('', { max: 1, windowMs: 60_000 }).allowed, true)
    assert.equal(checkParseRateLimit('', { max: 1, windowMs: 60_000 }).allowed, false)
    assert.equal(checkParseRateLimit('other', { max: 1, windowMs: 60_000 }).allowed, true)
  })

  it('blocks every request when max is 0', () => {
    const blocked = checkParseRateLimit('token-zero', { max: 0, windowMs: 60_000 })
    assert.equal(blocked.allowed, false)
    assert.ok(blocked.retryAfterSec && blocked.retryAfterSec >= 1)
  })

  it('allows exactly max requests then blocks', () => {
    const opts = { max: 2, windowMs: 60_000 }
    assert.equal(checkParseRateLimit('token-exact', opts).allowed, true)
    assert.equal(checkParseRateLimit('token-exact', opts).allowed, true)
    const blocked = checkParseRateLimit('token-exact', opts)
    assert.equal(blocked.allowed, false)
    assert.equal(typeof blocked.retryAfterSec, 'number')
  })

  it('retryAfterSec is at least 1 second', () => {
    const opts = { max: 1, windowMs: 1 }
    assert.equal(checkParseRateLimit('token-fast', opts).allowed, true)
    const blocked = checkParseRateLimit('token-fast', opts)
    assert.equal(blocked.allowed, false)
    assert.ok(blocked.retryAfterSec >= 1)
  })

  it('resets the window after windowMs elapses', async () => {
    const opts = { max: 1, windowMs: 40 }
    assert.equal(checkParseRateLimit('token-window', opts).allowed, true)
    assert.equal(checkParseRateLimit('token-window', opts).allowed, false)
    await new Promise((resolve) => setTimeout(resolve, 55))
    assert.equal(checkParseRateLimit('token-window', opts).allowed, true)
  })

  it('does not carry blocked state across resetParseRateLimitStore', () => {
    const opts = { max: 1, windowMs: 60_000 }
    checkParseRateLimit('token-reset', opts)
    assert.equal(checkParseRateLimit('token-reset', opts).allowed, false)
    resetParseRateLimitStore()
    assert.equal(checkParseRateLimit('token-reset', opts).allowed, true)
  })
})
