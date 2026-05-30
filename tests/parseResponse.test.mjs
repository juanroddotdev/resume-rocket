import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  countParsedFields,
  countDetectedCredentials,
  parsedResumeToApiFields,
} from '../server/utils/parseResponse.ts'

const PARSE_RESPONSE_KEYS = [
  'candidateId',
  'parse_failed',
  'partial_parse',
  'document_scan',
  'fields_found',
  'detected_credentials',
]

function assertParseResponseContract(payload) {
  for (const key of PARSE_RESPONSE_KEYS) {
    assert.ok(key in payload, `missing ${key}`)
  }
  assert.equal(typeof payload.parse_failed, 'boolean')
  assert.equal(typeof payload.partial_parse, 'boolean')
  assert.equal(typeof payload.document_scan, 'boolean')
  assert.equal(typeof payload.fields_found, 'number')
  assert.ok(Array.isArray(payload.detected_credentials))
}

describe('parse response contract', () => {
  it('matches POST /api/parse success shape', () => {
    const apiFields = parsedResumeToApiFields({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '555-0100',
      licenseNumber: 'RN-1',
      licenseState: 'CA',
      specialties: ['ICU'],
      employers: [{ name: 'Metro Hospital' }],
      detectedCredentials: ['BLS', 'ACLS'],
      rawText: 'ignored in api',
    })

    const payload = {
      candidateId: '00000000-0000-4000-8000-000000000001',
      parse_failed: false,
      parse_error: null,
      partial_parse: false,
      document_scan: false,
      fields_found: countParsedFields(apiFields) + countDetectedCredentials(['BLS', 'ACLS']),
      detected_credentials: ['BLS', 'ACLS'],
      ...apiFields,
    }

    assertParseResponseContract(payload)
    assert.ok(payload.fields_found >= 5)
  })

  it('matches total failure shape', () => {
    assertParseResponseContract({
      candidateId: '00000000-0000-4000-8000-000000000002',
      parse_failed: true,
      parse_error: 'No text extracted from document',
      partial_parse: false,
      document_scan: false,
      fields_found: 0,
      detected_credentials: [],
      suggested_employers: [],
    })
  })
})

describe('countParsedFields', () => {
  it('counts manifest field groups', () => {
    const count = countParsedFields({
      first_name: 'Jane',
      years_nursing_experience: '8',
      education: [{ degree: 'BSN' }],
      suggested_employers: [{ name: 'Hospital' }],
    })
    assert.equal(count, 4)
  })
})
