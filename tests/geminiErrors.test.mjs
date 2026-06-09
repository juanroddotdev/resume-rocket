import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getGeminiErrorDetails,
  isGeminiCapacityError,
  userFacingGeminiError,
  GEMINI_CAPACITY_PARSE_MESSAGE,
  GEMINI_CAPACITY_VISION_MESSAGE,
} from '../server/utils/geminiErrors.ts'

describe('getGeminiErrorDetails', () => {
  it('parses JSON error payloads in Error.message', () => {
    const details = getGeminiErrorDetails(
      new Error(
        JSON.stringify({
          error: {
            code: 503,
            message: 'This model is currently experiencing high demand.',
            status: 'UNAVAILABLE',
          },
        }),
      ),
    )
    assert.equal(details.code, 503)
    assert.equal(details.status, 'UNAVAILABLE')
    assert.match(details.message, /high demand/)
  })
})

describe('isGeminiCapacityError', () => {
  it('detects 503 UNAVAILABLE high demand', () => {
    assert.equal(
      isGeminiCapacityError(
        new Error(
          '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
        ),
      ),
      true,
    )
  })

  it('detects overloaded wording', () => {
    assert.equal(isGeminiCapacityError(new Error('Service overloaded, try again later')), true)
  })

  it('returns false for unrelated errors', () => {
    assert.equal(isGeminiCapacityError(new Error('Invalid API key')), false)
  })
})

describe('userFacingGeminiError', () => {
  it('returns friendly copy for capacity errors', () => {
    const err = new Error('{"error":{"code":503,"status":"UNAVAILABLE","message":"high demand"}}')
    assert.equal(userFacingGeminiError(err, 'text'), GEMINI_CAPACITY_PARSE_MESSAGE)
    assert.equal(userFacingGeminiError(err, 'vision'), GEMINI_CAPACITY_VISION_MESSAGE)
  })
})
