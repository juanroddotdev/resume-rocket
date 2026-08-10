import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CLAUDE_CAPACITY_PARSE_MESSAGE,
  CLAUDE_CAPACITY_VISION_MESSAGE,
  CLAUDE_GENERIC_PARSE_MESSAGE,
  CLAUDE_GENERIC_VISION_MESSAGE,
  getClaudeErrorDetails,
  isClaudeCapacityError,
  userFacingClaudeError,
} from '../server/utils/claudeErrors.ts'

describe('getClaudeErrorDetails', () => {
  it('reads Anthropic-style error objects from Error instances', () => {
    const err = new Error('overloaded')
    err.status = 529
    err.error = { type: 'overloaded_error', message: 'API overloaded' }

    const details = getClaudeErrorDetails(err)
    assert.equal(details.status, 529)
    assert.equal(details.type, 'overloaded_error')
    assert.equal(details.message, 'API overloaded')
  })
})

describe('isClaudeCapacityError', () => {
  it('detects rate limits and overloads', () => {
    assert.equal(isClaudeCapacityError({ status: 429, message: 'rate limit' }), true)
    assert.equal(isClaudeCapacityError({ error: { type: 'overloaded_error' } }), true)
  })

  it('returns false for unrelated errors', () => {
    assert.equal(isClaudeCapacityError(new Error('Invalid API key')), false)
  })
})

describe('userFacingClaudeError', () => {
  it('returns friendly copy for capacity errors', () => {
    const err = { status: 529, error: { type: 'overloaded_error' } }
    assert.equal(userFacingClaudeError(err, 'text'), CLAUDE_CAPACITY_PARSE_MESSAGE)
    assert.equal(userFacingClaudeError(err, 'vision'), CLAUDE_CAPACITY_VISION_MESSAGE)
  })

  it('does not leak raw Claude messages for other failures', () => {
    const err = new Error('Invalid API key xyz')
    assert.equal(userFacingClaudeError(err, 'text'), CLAUDE_GENERIC_PARSE_MESSAGE)
    assert.equal(userFacingClaudeError(err, 'vision'), CLAUDE_GENERIC_VISION_MESSAGE)
  })
})
