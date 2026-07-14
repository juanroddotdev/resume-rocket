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
    form.professional_snapshot = {
      snapshot_specialty: { value: 'ICU', included: true },
    }
    const snapshot = candidateFormSnapshot(form)
    assert.equal(snapshot.first_name, 'Jane')
    assert.equal(snapshot.employers?.[0]?.name, 'Metro Hospital')
    assert.equal(snapshot.professional_snapshot?.snapshot_specialty?.value, 'ICU')
    assert.equal(snapshot.professional_snapshot?.snapshot_specialty?.included, true)
  })
})

describe('applyParseResultToForm', () => {
  it('applies parse API fields onto form and rebuilds snapshot', () => {
    const form = defaultCandidateForm()
    applyParseResultToForm(form, {
      first_name: 'Jane',
      last_name: 'Doe',
      emr_system: 'Epic',
      specialties: ['ICU'],
      suggested_employers: [{
        name: 'Metro Hospital',
        employmentType: 'Travel',
        chargeNurseExperience: true,
        employer_hospital_suggestions: [],
      }],
      credentials: { BLS: { active: true, expiry: '2026-06-01' } },
    })
    assert.equal(form.first_name, 'Jane')
    assert.equal(form.emr_system, 'Epic')
    assert.equal(form.employers[0]?.name, 'Metro Hospital')
    assert.equal(form.credentials.BLS?.expiry, '06/2026')
    assert.equal(form.professional_snapshot.snapshot_specialty?.value, 'ICU')
    assert.equal(form.professional_snapshot.snapshot_travel_experience?.value, 'Yes — 1 travel contract')
    assert.equal(form.professional_snapshot.snapshot_charge_nurse_experience?.value, 'Yes')
  })
})
