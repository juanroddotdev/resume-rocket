import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  countParsedFields,
  countDetectedCredentials,
  parsedResumeToApiFields,
  credentialsInputFromParsed,
} from '../server/utils/parseResponse.ts'
import { hasParsedFields } from '../server/utils/parseHeuristics.ts'

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

/** Mirrors parseCandidateResume outcome flags (pure contract, no Gemini). */
function outcomeFlags({ geminiFailed, hasFields, documentVision }) {
  return {
    parse_failed: !hasFields,
    partial_parse: geminiFailed && hasFields,
    document_scan: documentVision,
  }
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
    assert.equal('audit' in payload, false)
    assert.equal('identified_facilities_raw' in payload, false)
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

  it('matches partial_parse when Gemini failed but heuristics found fields', () => {
    const flags = outcomeFlags({ geminiFailed: true, hasFields: true, documentVision: false })
    const payload = {
      candidateId: '00000000-0000-4000-8000-000000000003',
      ...flags,
      parse_error: null,
      fields_found: 2,
      detected_credentials: [],
      first_name: 'Alex',
      suggested_employers: [],
    }
    assertParseResponseContract(payload)
    assert.equal(payload.parse_failed, false)
    assert.equal(payload.partial_parse, true)
    assert.equal(payload.document_scan, false)
  })

  it('matches document_scan success shape', () => {
    const flags = outcomeFlags({ geminiFailed: false, hasFields: true, documentVision: true })
    const payload = {
      candidateId: '00000000-0000-4000-8000-000000000004',
      ...flags,
      parse_error: null,
      fields_found: 3,
      detected_credentials: ['BLS'],
      suggested_employers: [],
    }
    assertParseResponseContract(payload)
    assert.equal(payload.document_scan, true)
    assert.equal(payload.partial_parse, false)
    assert.equal(payload.parse_failed, false)
  })

  it('never sets partial_parse when parse_failed is true', () => {
    const flags = outcomeFlags({ geminiFailed: true, hasFields: false, documentVision: false })
    assert.equal(flags.parse_failed, true)
    assert.equal(flags.partial_parse, false)
  })
})

describe('parsedResumeToApiFields', () => {
  it('returns empty suggested_employers for null input', () => {
    const fields = parsedResumeToApiFields(null)
    assert.deepEqual(fields.suggested_employers, [])
    assert.equal(fields.first_name, undefined)
    assert.equal(countParsedFields(fields), 0)
  })

  it('maps camelCase parse fields to snake_case API keys', () => {
    const fields = parsedResumeToApiFields({
      firstName: 'Sam',
      homeState: 'TX',
      yearsNursingExperience: '5',
      employers: [{ name: 'City Hospital' }],
    })
    assert.equal(fields.first_name, 'Sam')
    assert.equal(fields.home_state, 'TX')
    assert.equal(fields.years_nursing_experience, '5')
    assert.equal(fields.suggested_employers?.length, 1)
  })

  it('treats empty employers as empty suggested_employers', () => {
    const fields = parsedResumeToApiFields({ firstName: 'Sam', employers: [] })
    assert.deepEqual(fields.suggested_employers, [])
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

  it('counts home_state separately from city and address', () => {
    const count = countParsedFields({
      home_address: '123 Main St',
      home_city: 'Austin',
      home_state: 'TX',
    })
    assert.equal(count, 3)
  })

  it('ignores empty strings and empty arrays', () => {
    assert.equal(
      countParsedFields({
        first_name: '',
        specialties: [],
        education: [],
        suggested_employers: [],
      }),
      0,
    )
  })

  it('counts licenses array once when non-empty', () => {
    assert.equal(
      countParsedFields({
        licenses: [{ state: 'CA', number: 'RN-1' }],
      }),
      1,
    )
  })
})

describe('countDetectedCredentials', () => {
  it('returns 0 for undefined or empty', () => {
    assert.equal(countDetectedCredentials(undefined), 0)
    assert.equal(countDetectedCredentials([]), 0)
  })

  it('counts credential labels', () => {
    assert.equal(countDetectedCredentials(['BLS', 'ACLS']), 2)
  })
})

describe('credentialsInputFromParsed', () => {
  it('returns null for null or empty credentials', () => {
    assert.equal(credentialsInputFromParsed(null), null)
    assert.equal(credentialsInputFromParsed({}), null)
    assert.equal(credentialsInputFromParsed({ detectedCredentials: [] }), null)
  })

  it('marks detected credential names active', () => {
    const input = credentialsInputFromParsed({
      detectedCredentials: ['bls', 'ACLS'],
    })
    assert.ok(input)
    assert.equal(input.BLS, true)
    assert.equal(input.ACLS, true)
  })

  it('merges certificationDetails with optional expiry', () => {
    const input = credentialsInputFromParsed({
      detectedCredentials: ['BLS'],
      certificationDetails: [
        { name: 'ACLS', expiry: '08/2026' },
        { name: 'UnknownCert' },
      ],
    })
    assert.ok(input)
    assert.equal(input.BLS, true)
    assert.deepEqual(input.ACLS, { active: true, expiry: '08/2026' })
    assert.deepEqual(input.UNKNOWNCERT, { active: true })
  })
})

describe('outcome flags + hasParsedFields', () => {
  it('credentials alone count as parsed content for partial_parse path', () => {
    assert.equal(hasParsedFields({ detectedCredentials: ['BLS'] }), true)
    const flags = outcomeFlags({
      geminiFailed: true,
      hasFields: hasParsedFields({ detectedCredentials: ['BLS'] }),
      documentVision: false,
    })
    assert.equal(flags.partial_parse, true)
    assert.equal(flags.parse_failed, false)
  })

  it('empty object is total failure', () => {
    assert.equal(hasParsedFields({}), false)
    const flags = outcomeFlags({
      geminiFailed: false,
      hasFields: false,
      documentVision: true,
    })
    assert.equal(flags.parse_failed, true)
    assert.equal(flags.partial_parse, false)
    assert.equal(flags.document_scan, true)
  })
})
