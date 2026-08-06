/**
 * Education location helpers (city/state + Accept suggestions + DOCX school line).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyEducationLocationSuggestion,
  dismissEducationLocationSuggestion,
  educationHasLocationSuggestion,
  formatEducationLocation,
  formatEducationSchoolForDocx,
} from '../utils/educationLocation.ts'
import { normalizeEducation } from '../server/utils/normalizeCandidate.ts'

describe('formatEducationSchoolForDocx', () => {
  it('appends City, ST when both present (no parentheses)', () => {
    assert.equal(
      formatEducationSchoolForDocx({ school: 'State U', city: 'Austin', state: 'TX' }),
      'State U, Austin, TX',
    )
  })

  it('returns school alone when location empty', () => {
    assert.equal(formatEducationSchoolForDocx({ school: 'State U' }), 'State U')
  })

  it('formats city only', () => {
    assert.equal(formatEducationLocation({ city: 'Austin' }), 'Austin')
    assert.equal(formatEducationSchoolForDocx({ school: 'State U', city: 'Austin' }), 'State U, Austin')
  })

  it('returns location alone when school empty', () => {
    assert.equal(formatEducationSchoolForDocx({ city: 'Austin', state: 'TX' }), 'Austin, TX')
  })
})

describe('education location suggestions', () => {
  it('detects pending suggestion only when committed location empty', () => {
    assert.equal(
      educationHasLocationSuggestion({ school: 'UMich', suggestedCity: 'Ann Arbor', suggestedState: 'MI' }),
      true,
    )
    assert.equal(
      educationHasLocationSuggestion({
        school: 'UMich',
        city: 'Ann Arbor',
        suggestedCity: 'Ann Arbor',
        suggestedState: 'MI',
      }),
      false,
    )
  })

  it('Accept copies suggestion into city/state and clears suggestion keys', () => {
    const next = applyEducationLocationSuggestion({
      school: 'UMich',
      suggestedCity: 'Ann Arbor',
      suggestedState: 'MI',
    })
    assert.equal(next.city, 'Ann Arbor')
    assert.equal(next.state, 'MI')
    assert.equal(next.suggestedCity, undefined)
    assert.equal(next.suggestedState, undefined)
  })

  it('Dismiss clears suggestion without setting city/state', () => {
    const next = dismissEducationLocationSuggestion({
      school: 'UMich',
      suggestedCity: 'Ann Arbor',
      suggestedState: 'MI',
    })
    assert.equal(next.city, undefined)
    assert.equal(next.suggestedCity, undefined)
  })
})

describe('normalizeEducation city/state', () => {
  it('keeps city and state from camelCase or snake_case', () => {
    const rows = normalizeEducation([
      { degree: 'BSN', school: 'State U', city: 'Austin', state: 'TX' },
      { degree: 'MSN', school: 'Other', education_city: 'Dallas', education_state: 'TX' },
    ])
    assert.equal(rows[0]?.city, 'Austin')
    assert.equal(rows[0]?.state, 'TX')
    assert.equal(rows[1]?.city, 'Dallas')
  })

  it('strips client-only suggestedCity/suggestedState on persist', () => {
    const rows = normalizeEducation([
      {
        degree: 'BSN',
        school: 'State U',
        suggestedCity: 'Austin',
        suggestedState: 'TX',
      },
    ])
    assert.equal(rows[0]?.city, undefined)
    assert.equal(rows[0]?.suggestedCity, undefined)
    assert.equal(rows[0]?.school, 'State U')
  })
})
