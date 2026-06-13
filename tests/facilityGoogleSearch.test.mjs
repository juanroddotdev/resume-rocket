import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { facilityGoogleSearchUrl } from '../utils/facilityGoogleSearch.ts'

describe('facilityGoogleSearchUrl', () => {
  it('builds a Google search URL from employer card fields', () => {
    const url = facilityGoogleSearchUrl({
      name: 'Metro General',
      city: 'Austin',
      state: 'TX',
    })
    assert.match(url, /^https:\/\/www\.google\.com\/search\?q=/)
    assert.match(decodeURIComponent(url), /Metro General/)
    assert.match(decodeURIComponent(url), /Austin, TX/)
    assert.match(decodeURIComponent(url), /trauma level beds teaching hospital/)
  })

  it('omits empty location segments', () => {
    const url = decodeURIComponent(facilityGoogleSearchUrl({ name: 'Regional Medical' }))
    assert.match(url, /Regional Medical/)
    assert.doesNotMatch(url, /undefined/)
  })
})
