import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildParseAudit,
  mapGeminiResumeJson,
  PARSE_AUDIT_SNIPPET_MAX_CHARS,
} from '../server/utils/geminiShared.ts'

describe('buildParseAudit', () => {
  it('captures identified facilities and employer snippets', () => {
    const audit = buildParseAudit({
      identified_facilities_raw: [' Metro Hospital ', 'Metro Hospital'],
      suggested_employers: [
        {
          name: 'Metro Hospital',
          source_snippet: ' ICU RN at Metro Hospital, Austin TX ',
        },
      ],
    })

    assert.ok(audit)
    assert.deepEqual(audit.identifiedFacilitiesRaw, ['Metro Hospital', 'Metro Hospital'])
    assert.equal(audit.suggestedEmployers?.[0]?.name, 'Metro Hospital')
    assert.equal(
      audit.suggestedEmployers?.[0]?.sourceSnippet,
      'ICU RN at Metro Hospital, Austin TX',
    )
    assert.ok(audit.capturedAt)
  })

  it('truncates long source snippets', () => {
    const longSnippet = 'x'.repeat(PARSE_AUDIT_SNIPPET_MAX_CHARS + 50)
    const audit = buildParseAudit({
      suggested_employers: [{ name: 'Hospital', source_snippet: longSnippet }],
    })

    assert.equal(audit?.suggestedEmployers?.[0]?.sourceSnippet?.length, PARSE_AUDIT_SNIPPET_MAX_CHARS)
  })

  it('returns null when audit fields are empty', () => {
    assert.equal(buildParseAudit({}), null)
  })

  it('captures certification, license, and education snippets', () => {
    const audit = buildParseAudit({
      certifications: [
        { name: 'BLS', expiry: '06/2026', source_snippet: 'BLS certified through 06/2026' },
      ],
      licenses: [
        { state: 'CA', number: 'RN-123', expiry: '06/2027', source_snippet: 'California RN 123456' },
      ],
      education: [
        { degree: 'BSN', school: 'State University', source_snippet: 'BSN, State University, 2016' },
      ],
    })

    assert.ok(audit)
    assert.equal(audit.suggestedCertifications?.[0]?.name, 'BLS')
    assert.equal(audit.suggestedCertifications?.[0]?.sourceSnippet, 'BLS certified through 06/2026')
    assert.equal(audit.suggestedLicenses?.[0]?.state, 'CA')
    assert.equal(audit.suggestedLicenses?.[0]?.sourceSnippet, 'California RN 123456')
    assert.equal(audit.suggestedEducation?.[0]?.degree, 'BSN')
    assert.equal(audit.suggestedEducation?.[0]?.sourceSnippet, 'BSN, State University, 2016')
  })
})

describe('mapGeminiResumeJson audit stripping', () => {
  it('does not expose audit fields on resume or employers', () => {
    const { resume, audit } = mapGeminiResumeJson(
      {
        first_name: 'Jane',
        identified_facilities_raw: ['Metro Hospital'],
        suggested_employers: [
          {
            name: 'Metro Hospital',
            role: 'ICU RN',
            source_snippet: 'ICU RN — Metro Hospital',
            beds: 450,
            trauma_level: 'I',
          },
        ],
      },
      'raw text',
    )

    assert.ok(audit?.identifiedFacilitiesRaw?.length)
    assert.equal(resume.employers?.[0]?.name, 'Metro Hospital')
    assert.equal('sourceSnippet' in (resume.employers?.[0] ?? {}), false)
    assert.equal('beds' in (resume.employers?.[0] ?? {}), false)
    assert.equal('traumaLevel' in (resume.employers?.[0] ?? {}), false)
    assert.equal('identifiedFacilitiesRaw' in resume, false)
    assert.equal('sourceSnippet' in (resume.certificationDetails?.[0] ?? {}), false)
    assert.equal('sourceSnippet' in (resume.licenses?.[0] ?? {}), false)
    assert.equal('sourceSnippet' in (resume.education?.[0] ?? {}), false)
  })
})
