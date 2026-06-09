import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isEditableWizardStep,
  parseStepQuery,
  stepToQuery,
} from '../utils/intakeWizardStep.ts'

describe('parseStepQuery', () => {
  it('returns null for empty or invalid values', () => {
    assert.equal(parseStepQuery(undefined), null)
    assert.equal(parseStepQuery(''), null)
    assert.equal(parseStepQuery('foo'), null)
    assert.equal(parseStepQuery('5'), null)
    assert.equal(parseStepQuery('-1'), null)
  })

  it('accepts steps 0 through 4 and success', () => {
    assert.equal(parseStepQuery('0'), 0)
    assert.equal(parseStepQuery('2'), 2)
    assert.equal(parseStepQuery('4'), 4)
    assert.equal(parseStepQuery('success'), 'success')
    assert.equal(parseStepQuery('SUCCESS'), 'success')
  })
})

describe('stepToQuery', () => {
  it('omits step 0 from the query string', () => {
    assert.equal(stepToQuery(0), undefined)
  })

  it('serializes editable steps and success', () => {
    assert.equal(stepToQuery(1), '1')
    assert.equal(stepToQuery(4), '4')
    assert.equal(stepToQuery('success'), 'success')
  })
})

describe('isEditableWizardStep', () => {
  it('identifies steps 1 through 4', () => {
    assert.equal(isEditableWizardStep(1), true)
    assert.equal(isEditableWizardStep(4), true)
    assert.equal(isEditableWizardStep(0), false)
    assert.equal(isEditableWizardStep('success'), false)
  })
})
