import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EMPLOYMENT_TYPE_OPTIONS,
  isKnownEmploymentType,
  normalizeEmploymentType,
} from '../utils/employmentType.ts'

describe('normalizeEmploymentType', () => {
  it('returns empty for blank values', () => {
    assert.equal(normalizeEmploymentType(''), '')
    assert.equal(normalizeEmploymentType(null), '')
  })

  it('maps parse-style values to canonical options', () => {
    assert.equal(normalizeEmploymentType('Travel RN'), 'Travel')
    assert.equal(normalizeEmploymentType('staff nurse'), 'Staff')
    assert.equal(normalizeEmploymentType('PRN / per diem'), 'PRN')
  })

  it('accepts exact canonical values', () => {
    for (const option of EMPLOYMENT_TYPE_OPTIONS) {
      assert.equal(normalizeEmploymentType(option), option)
    }
  })

  it('returns empty for unknown free text', () => {
    assert.equal(normalizeEmploymentType('Locums'), '')
  })
})

describe('isKnownEmploymentType', () => {
  it('recognizes canonical options only', () => {
    assert.equal(isKnownEmploymentType('Travel'), true)
    assert.equal(isKnownEmploymentType('Travel RN'), false)
  })
})
