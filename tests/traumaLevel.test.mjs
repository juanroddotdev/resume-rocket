import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isKnownTraumaLevel, normalizeTraumaLevel } from '../utils/traumaLevel.ts'

describe('normalizeTraumaLevel', () => {
  it('accepts Roman numerals and normalizes digits', () => {
    assert.equal(normalizeTraumaLevel('II'), 'II')
    assert.equal(normalizeTraumaLevel('2'), 'II')
    assert.equal(normalizeTraumaLevel('Level III'), 'III')
  })

  it('returns empty for blank values', () => {
    assert.equal(normalizeTraumaLevel(''), '')
    assert.equal(normalizeTraumaLevel(undefined), '')
  })
})

describe('isKnownTraumaLevel', () => {
  it('recognizes canonical levels only', () => {
    assert.equal(isKnownTraumaLevel('I'), true)
    assert.equal(isKnownTraumaLevel('Level 5'), false)
  })
})
