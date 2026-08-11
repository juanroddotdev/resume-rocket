import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FACILITY_GOOGLE_SEARCH_LABELS,
  FACILITY_GOOGLE_SEARCH_PROMPTS,
  facilityGoogleEmrSearchUrl,
  facilityGoogleSearchUrl,
} from '../utils/facilityGoogleSearch.ts'

describe('facilityGoogleSearchUrl', () => {
  it('builds a Google search URL from employer card fields', () => {
    const url = facilityGoogleSearchUrl({
      name: 'Metro General',
      city: 'Austin',
      state: 'TX',
    })
    const decoded = decodeURIComponent(url)
    assert.match(url, /^https:\/\/www\.google\.com\/search\?q=/)
    assert.match(decoded, /Metro General/)
    assert.match(decoded, /Austin, TX/)
    for (const prompt of FACILITY_GOOGLE_SEARCH_PROMPTS) {
      assert.match(decoded, new RegExp(prompt.replace(/[?*+^${}()|[\]\\]/g, '\\$&')))
    }
    assert.doesNotMatch(decoded, /"trauma level"/)
  })

  it('exposes readable labels without trailing question marks', () => {
    assert.deepEqual(FACILITY_GOOGLE_SEARCH_LABELS, [
      'trauma level',
      'total beds',
      'teaching hospital',
      'Magnet',
      'EMR',
      'charting system',
    ])
  })

  it('omits empty location segments', () => {
    const url = decodeURIComponent(facilityGoogleSearchUrl({ name: 'Regional Medical' }))
    assert.match(url, /Regional Medical/)
    assert.doesNotMatch(url, /undefined/)
  })

  it('prefers live searchQuery over employer name', () => {
    const url = decodeURIComponent(
      facilityGoogleSearchUrl(
        { name: 'Metro General', city: 'Austin', state: 'TX' },
        { searchQuery: 'Trinity Health Grand Rapids' },
      ),
    )
    assert.match(url, /Trinity Health Grand Rapids/)
    assert.doesNotMatch(url, /Metro General/)
    assert.match(url, /Austin, TX/)
    assert.match(url, /trauma level\?/)
  })

  it('does not duplicate location already present in searchQuery', () => {
    const url = decodeURIComponent(
      facilityGoogleSearchUrl(
        { name: 'Metro', city: 'Austin', state: 'TX' },
        { searchQuery: 'Metro General Austin, TX' },
      ),
    )
    assert.equal(url.match(/Austin, TX/g)?.length, 1)
  })

  it('supports an admin-configured facility template', () => {
    const url = facilityGoogleSearchUrl(
      { name: 'Metro General', city: 'Austin', state: 'TX' },
      { template: 'https://www.google.com/search?q={facilityName}+{city}+{state}+trauma' },
    )
    assert.equal(url, 'https://www.google.com/search?q=Metro%20General+Austin+TX+trauma')
  })
})

describe('facilityGoogleEmrSearchUrl', () => {
  it('builds a focused EMR / charting search without facility metrics prompts', () => {
    const decoded = decodeURIComponent(
      facilityGoogleEmrSearchUrl({
        name: 'Metro General',
        city: 'Austin',
        state: 'TX',
      }),
    )
    assert.match(decoded, /Metro General/)
    assert.match(decoded, /Austin, TX/)
    assert.match(decoded, /\bEMR\?/)
    assert.match(decoded, /charting system\?/)
    assert.doesNotMatch(decoded, /trauma level/)
    assert.doesNotMatch(decoded, /total beds/)
    assert.doesNotMatch(decoded, /teaching hospital/)
    assert.doesNotMatch(decoded, /Magnet/)
  })
})
