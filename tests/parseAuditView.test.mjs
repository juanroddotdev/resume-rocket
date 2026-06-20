import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  buildParseAudit,
  mapGeminiResumeJson,
} from '../server/utils/geminiShared.ts'
import {
  buildParseAuditView,
  parseOutcomeFromBlob,
  snippetOverlapsRawText,
} from '../server/utils/parseAuditView.ts'

describe('parseOutcomeFromBlob', () => {
  it('reads outcome from parsed_resume JSONB', () => {
    const outcome = parseOutcomeFromBlob({
      raw: 'hidden',
      outcome: {
        fields_found: 12,
        partial_parse: true,
        document_scan: false,
        gemini_failed: true,
        parse_failed: false,
      },
    })

    assert.deepEqual(outcome, {
      fields_found: 12,
      partial_parse: true,
      document_scan: false,
      gemini_failed: true,
      parse_failed: false,
    })
  })
})

describe('buildParseAuditView', () => {
  it('flags employers missing from wizard and missing snippets', () => {
    const view = buildParseAuditView({
      candidateId: 'c1',
      firstName: 'Jane',
      lastName: 'Doe',
      parseError: null,
      parsedResume: {
        audit: {
          identifiedFacilitiesRaw: ['Metro General Hospital', 'St. Mary Medical'],
          suggestedEmployers: [
            { name: 'Metro General Hospital', sourceSnippet: 'ICU RN at Metro General' },
            { name: 'Regional Medical Center' },
          ],
          capturedAt: '2026-06-09T12:00:00.000Z',
        },
        outcome: {
          fields_found: 10,
          partial_parse: false,
          document_scan: false,
          gemini_failed: false,
          parse_failed: false,
        },
      },
      wizardEmployers: [{ name: 'Metro General Hospital' }],
    })

    assert.equal(view.employers[0]?.inWizard, true)
    assert.equal(view.employers[0]?.missingSnippet, false)
    assert.equal(view.employers[1]?.inWizard, false)
    assert.equal(view.employers[1]?.missingSnippet, true)
    assert.deepEqual(view.facilitiesWithoutEmployer, ['St. Mary Medical'])
  })

  it('flags certifications, licenses, and education missing from wizard or snippets', () => {
    const view = buildParseAuditView({
      candidateId: 'c1',
      firstName: 'Jane',
      lastName: 'Doe',
      parseError: null,
      parsedResume: {
        audit: {
          suggestedCertifications: [
            { name: 'BLS', expiry: '06/2026', sourceSnippet: 'BLS current 06/2026' },
            { name: 'CCRN' },
          ],
          suggestedLicenses: [
            { state: 'CA', number: 'RN-1', sourceSnippet: 'California RN license' },
            { state: 'TX', number: 'RN-2' },
          ],
          suggestedEducation: [
            { degree: 'BSN', school: 'State U', sourceSnippet: 'BSN State U 2016' },
            { degree: 'MSN', school: 'Other U' },
          ],
          capturedAt: '2026-06-09T12:00:00.000Z',
        },
      },
      wizardEmployers: [],
      wizardLicenses: [{ state: 'CA', number: 'RN-1' }],
      wizardEducation: [{ degree: 'BSN', school: 'State U' }],
      wizardCredentials: {
        BLS: { active: true, expiry: '06/2026' },
      },
    })

    assert.equal(view.certifications[0]?.inWizard, true)
    assert.equal(view.certifications[0]?.missingSnippet, false)
    assert.equal(view.certifications[1]?.inWizard, false)
    assert.equal(view.certifications[1]?.missingSnippet, true)

    assert.equal(view.licenses[0]?.inWizard, true)
    assert.equal(view.licenses[1]?.inWizard, false)
    assert.equal(view.licenses[1]?.missingSnippet, true)

    assert.equal(view.education[0]?.inWizard, true)
    assert.equal(view.education[1]?.inWizard, false)
    assert.equal(view.education[1]?.missingSnippet, true)
  })
})

describe('parse fixture regression', () => {
  it('recorded Gemini JSON produces audit snippets overlapping fixture raw text', () => {
    const fixtureDir = join(process.cwd(), 'tests', 'fixtures')
    const rawText = readFileSync(join(fixtureDir, 'sample-resume-multi.txt'), 'utf8')
    const recorded = JSON.parse(readFileSync(join(fixtureDir, 'gemini-multi-employer.json'), 'utf8'))

    const audit = buildParseAudit(recorded)
    assert.ok(audit?.identifiedFacilitiesRaw?.length === 2)
    assert.ok(audit?.suggestedEmployers?.length === 2)

    for (const employer of audit.suggestedEmployers ?? []) {
      assert.ok(employer.sourceSnippet, `expected snippet for ${employer.name}`)
      assert.ok(
        snippetOverlapsRawText(employer.sourceSnippet, rawText),
        `snippet should overlap raw text for ${employer.name}`,
      )
    }

    const { resume, audit: mappedAudit } = mapGeminiResumeJson(recorded, rawText)
    assert.equal(resume.employers?.length, 2)
    assert.ok(mappedAudit?.suggestedEmployers?.length)
    assert.equal('sourceSnippet' in (resume.employers?.[0] ?? {}), false)
  })
})
