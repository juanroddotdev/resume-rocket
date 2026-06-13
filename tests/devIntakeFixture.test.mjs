import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildDevIntakeParsePayload,
  buildDevIntakeParsePayloadComplete,
} from '../utils/devIntakeFixture.ts'

describe('buildDevIntakeParsePayload', () => {
  it('returns partial identity and clinical data', () => {
    const payload = buildDevIntakeParsePayload('test-id')
    assert.equal(payload.candidateId, 'test-id')
    assert.equal(payload.first_name, 'Allison')
    assert.equal(payload.last_name, 'Coon')
    assert.equal(payload.partial_parse, true)
    assert.ok(payload.specialties?.length)
    assert.equal(payload.years_nursing_experience, '6')
  })

  it('omits fields that should appear in gap review', () => {
    const payload = buildDevIntakeParsePayload()
    assert.equal(payload.license_number, undefined)
    assert.equal(payload.license_state, undefined)
    assert.equal(payload.emr_system, undefined)
    assert.equal(payload.compact_license_status, undefined)
    assert.equal(payload.average_patient_ratios, undefined)
    assert.equal(payload.specialized_medical_equipment, undefined)
    assert.equal(payload.education?.[0]?.graduationYear, undefined)
  })

  it('includes unlinked employers with hospital suggestions', () => {
    const payload = buildDevIntakeParsePayload()
    assert.equal(payload.suggested_employers?.length, 2)
    const first = payload.suggested_employers?.[0]
    assert.ok(first?.employer_hospital_suggestions?.length)
    assert.equal(first?.endDate, undefined)
    const suggestionId = first?.employer_hospital_suggestions?.[0]?.id
    assert.match(String(suggestionId), /^[0-9a-f-]{36}$/i)
  })
})

describe('buildDevIntakeParsePayloadComplete', () => {
  it('includes license, EMR, and full employer rows', () => {
    const payload = buildDevIntakeParsePayloadComplete('complete-id')
    assert.equal(payload.candidateId, 'complete-id')
    assert.equal(payload.partial_parse, false)
    assert.equal(payload.license_number, 'RN-123456')
    assert.equal(payload.license_state, 'CA')
    assert.equal(payload.emr_system, 'Epic')
    assert.equal(payload.education?.[0]?.graduationMonth, '06')
    assert.equal(payload.education?.[0]?.graduationYear, '2016')
    assert.equal(payload.suggested_employers?.length, 2)
    assert.equal(payload.suggested_employers?.[0]?.employmentType, 'Staff')
    assert.ok(payload.credentials?.BLS?.expiry)
  })
})
