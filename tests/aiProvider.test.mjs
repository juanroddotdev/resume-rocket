import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  inferAiProviderName,
  normalizeAiProviderName,
} from '../server/utils/aiProvider.ts'

describe('normalizeAiProviderName', () => {
  it('accepts supported provider names case-insensitively', () => {
    assert.equal(normalizeAiProviderName(' Gemini '), 'gemini')
    assert.equal(normalizeAiProviderName('CLAUDE'), 'claude')
  })

  it('returns null for empty values', () => {
    assert.equal(normalizeAiProviderName(''), null)
    assert.equal(normalizeAiProviderName(undefined), null)
  })

  it('rejects unsupported providers', () => {
    assert.throws(
      () => normalizeAiProviderName('openai'),
      /Unsupported AI_PROVIDER/,
    )
  })
})

describe('inferAiProviderName', () => {
  it('uses explicit provider over detected keys', () => {
    assert.equal(
      inferAiProviderName({
        rawProvider: 'claude',
        geminiConfigured: true,
        claudeConfigured: true,
      }),
      'claude',
    )
  })

  it('keeps Gemini as the default when Gemini is configured', () => {
    assert.equal(
      inferAiProviderName({
        geminiConfigured: true,
        claudeConfigured: true,
      }),
      'gemini',
    )
  })

  it('uses Claude when only Claude is configured', () => {
    assert.equal(
      inferAiProviderName({
        geminiConfigured: false,
        claudeConfigured: true,
      }),
      'claude',
    )
  })
})
