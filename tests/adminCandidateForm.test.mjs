import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  adminSectionForStep,
  applyParseResultToForm,
  candidateFormSnapshot,
  defaultCandidateForm,
} from '../utils/adminCandidateForm.ts'

describe('adminSectionForStep', () => {
  it('maps wizard steps to admin sections', () => {
    assert.equal(adminSectionForStep(0), 'resume')
    assert.equal(adminSectionForStep(1), 'identity')
    assert.equal(adminSectionForStep(2), 'employment')
    assert.equal(adminSectionForStep(3), 'credentials')
    assert.equal(adminSectionForStep(4), 'review')
  })
})

describe('candidateFormSnapshot', () => {
  it('maps admin form state to PATCH payload', () => {
    const form = defaultCandidateForm()
    form.first_name = 'Jane'
    form.employers = [{ name: 'Metro Hospital' }]
    const snapshot = candidateFormSnapshot(form)
    assert.equal(snapshot.first_name, 'Jane')
    assert.equal(snapshot.employers?.[0]?.name, 'Metro Hospital')
  })
})

describe('applyParseResultToForm', () => {
  it('applies parse API fields onto form', () => {
    const form = defaultCandidateForm()
    applyParseResultToForm(form, {
      first_name: 'Jane',
      last_name: 'Doe',
      emr_system: 'Epic',
      suggested_employers: [{ name: 'Metro Hospital', employer_hospital_suggestions: [] }],
      credentials: { BLS: { active: true, expiry: '2026-06-01' } },
    })
    assert.equal(form.first_name, 'Jane')
    assert.equal(form.emr_system, 'Epic')
    assert.equal(form.employers[0]?.name, 'Metro Hospital')
    assert.equal(form.credentials.BLS?.expiry, '06/2026')
  })
})
