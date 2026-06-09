import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  collectParsePrefillFieldIds,
  employerFacilityMetricsKey,
  mergeFieldIdMaps,
} from '../utils/intakePrefillHighlight.ts'

describe('collectParsePrefillFieldIds', () => {
  it('maps identity and clinical summary fields', () => {
    const ids = collectParsePrefillFieldIds({
      first_name: 'Jane',
      license_state: 'TX',
      specialties: ['ICU'],
      years_nursing_experience: '8',
    })

    assert.ok(ids.includes('first_name'))
    assert.ok(ids.includes('license_state'))
    assert.ok(ids.includes('specialties'))
    assert.ok(ids.includes('years_nursing_experience'))
  })

  it('maps education and employer fields with snake_case dates', () => {
    const ids = collectParsePrefillFieldIds({
      education: [{ degree: 'BSN', school: 'State U', graduationYear: '2018' }],
      suggested_employers: [{
        name: 'Metro Hospital',
        role: 'ICU RN',
        start_date: '2020-01',
        highlights: ['Charge nurse'],
      }],
      detected_credentials: ['bls'],
    })

    assert.ok(ids.includes('education-0-degree'))
    assert.ok(ids.includes('employer-0-start'))
    assert.ok(ids.includes('employer-0-highlights'))
    assert.ok(ids.includes('credential-BLS'))
  })
})

describe('employerFacilityMetricsKey', () => {
  it('builds stable employer metric keys', () => {
    assert.equal(employerFacilityMetricsKey(2), 'employer-2-facility-metrics')
  })
})

describe('mergeFieldIdMaps', () => {
  it('merges without dropping existing keys', () => {
    const merged = mergeFieldIdMaps({ first_name: true }, ['email', 'first_name'])
    assert.deepEqual(merged, { first_name: true, email: true })
  })
})
