import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatEducationGraduationForDocx,
  normalizeGraduationMonth,
  normalizeGraduationYear,
  splitLegacyGraduationValue,
} from '../utils/educationGraduation.ts'

describe('normalizeGraduationMonth', () => {
  it('zero-pads numeric months', () => {
    assert.equal(normalizeGraduationMonth('6'), '06')
    assert.equal(normalizeGraduationMonth('06'), '06')
  })
})

describe('normalizeGraduationYear', () => {
  it('accepts YYYY and legacy combined values', () => {
    assert.equal(normalizeGraduationYear('2016'), '2016')
    assert.equal(normalizeGraduationYear('06/2016'), '2016')
    assert.equal(normalizeGraduationYear('2016-05'), '2016')
  })
})

describe('splitLegacyGraduationValue', () => {
  it('splits MM/YYYY and ISO month values', () => {
    assert.deepEqual(splitLegacyGraduationValue('06/2016'), {
      graduationMonth: '06',
      graduationYear: '2016',
    })
    assert.deepEqual(splitLegacyGraduationValue('2016-05-01'), {
      graduationMonth: '05',
      graduationYear: '2016',
    })
  })
})

describe('formatEducationGraduationForDocx', () => {
  it('renders MM/YYYY when month and year are present', () => {
    assert.equal(
      formatEducationGraduationForDocx({ graduationMonth: '6', graduationYear: '2016' }),
      '06/2016',
    )
    assert.equal(
      formatEducationGraduationForDocx({ graduationYear: '2016' }),
      '2016',
    )
  })
})
