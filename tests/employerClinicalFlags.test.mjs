import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CHARGE_NURSE_HIGHLIGHT_LABEL,
  PRECEPTOR_HIGHLIGHT_LABEL,
  experienceHighlightsForDocx,
  inferClinicalFlagsFromHighlights,
  resolveClinicalFlagFromParse,
  triStateBoolFromSelect,
  triStateBoolValue,
} from '../utils/employerClinicalFlags.ts'

describe('experienceHighlightsForDocx', () => {
  it('appends charge and preceptor lines when yes and not already in highlights', () => {
    const items = experienceHighlightsForDocx({
      highlights: ['Led rapid response team'],
      chargeNurseExperience: true,
      preceptorExperience: true,
    })
    assert.deepEqual(items, [
      'Led rapid response team',
      CHARGE_NURSE_HIGHLIGHT_LABEL,
      PRECEPTOR_HIGHLIGHT_LABEL,
    ])
  })

  it('always appends canonical labels when yes even if highlights mention keywords', () => {
    const items = experienceHighlightsForDocx({
      highlights: ['Charge nurse 18 months', 'Preceptor for new grads'],
      chargeNurseExperience: true,
      preceptorExperience: true,
    })
    assert.deepEqual(items, [
      'Charge nurse 18 months',
      'Preceptor for new grads',
      CHARGE_NURSE_HIGHLIGHT_LABEL,
      PRECEPTOR_HIGHLIGHT_LABEL,
    ])
  })
})

describe('resolveClinicalFlagFromParse', () => {
  it('honors explicit false over highlight inference', () => {
    assert.equal(resolveClinicalFlagFromParse(false, true), false)
    assert.equal(resolveClinicalFlagFromParse(true, false), true)
    assert.equal(resolveClinicalFlagFromParse(undefined, true), true)
  })
})

describe('inferClinicalFlagsFromHighlights', () => {
  it('detects charge and preceptor keywords', () => {
    assert.deepEqual(
      inferClinicalFlagsFromHighlights(['Charge nurse on nights']),
      { chargeNurseExperience: true },
    )
    assert.deepEqual(
      inferClinicalFlagsFromHighlights(['Clinical preceptor']),
      { preceptorExperience: true },
    )
  })
})

describe('triStateBoolValue', () => {
  it('maps boolean to select values', () => {
    assert.equal(triStateBoolValue(true), 'yes')
    assert.equal(triStateBoolValue(false), 'no')
    assert.equal(triStateBoolValue(undefined), '')
    assert.equal(triStateBoolFromSelect('yes'), true)
    assert.equal(triStateBoolFromSelect('no'), false)
    assert.equal(triStateBoolFromSelect(''), undefined)
  })
})
