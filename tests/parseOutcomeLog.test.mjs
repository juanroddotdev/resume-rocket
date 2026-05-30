import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyParseError } from '../server/utils/parseOutcomeLog.ts'

describe('classifyParseError', () => {
  it('classifies vision-required failures', () => {
    assert.equal(
      classifyParseError('This resume looks image-based. Add GEMINI_API_KEY for visual scanning.'),
      'vision_required',
    )
  })

  it('classifies empty text failures', () => {
    assert.equal(classifyParseError('No text extracted from document'), 'no_text')
  })

  it('returns undefined for empty input', () => {
    assert.equal(classifyParseError(null), undefined)
    assert.equal(classifyParseError(''), undefined)
  })

  it('does not echo resume-like content', () => {
    const kind = classifyParseError('Jane Doe RN jane@example.com license 12345')
    assert.equal(kind, 'other')
  })
})
