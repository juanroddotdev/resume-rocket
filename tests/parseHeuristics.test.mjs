import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasParsedFields,
  mergeParsedResume,
} from '../server/utils/parseHeuristics.ts'

describe('mergeParsedResume', () => {
  it('preserves Gemini home address fields when merging heuristics', () => {
    const merged = mergeParsedResume(
      {
        firstName: 'Jane',
        homeAddress: '123 Main St',
        homeCity: 'Austin',
        homeState: 'TX',
        rawText: 'gemini',
      },
      {
        email: 'jane@example.com',
        phone: '555-0100',
        rawText: 'heuristic',
      },
    )

    assert.equal(merged.firstName, 'Jane')
    assert.equal(merged.email, 'jane@example.com')
    assert.equal(merged.homeAddress, '123 Main St')
    assert.equal(merged.homeCity, 'Austin')
    assert.equal(merged.homeState, 'TX')
  })

  it('falls back to heuristic home fields when Gemini omitted them', () => {
    const merged = mergeParsedResume(
      { firstName: 'Jane' },
      {
        homeCity: 'Dallas',
        homeState: 'TX',
      },
    )

    assert.equal(merged.homeCity, 'Dallas')
    assert.equal(merged.homeState, 'TX')
  })
})

describe('hasParsedFields', () => {
  it('treats home identity fields as parsed content', () => {
    assert.equal(hasParsedFields({ homeState: 'TX' }), true)
    assert.equal(hasParsedFields({ homeCity: 'Austin' }), true)
    assert.equal(hasParsedFields({ homeAddress: '123 Main St' }), true)
    assert.equal(hasParsedFields({}), false)
  })
})
