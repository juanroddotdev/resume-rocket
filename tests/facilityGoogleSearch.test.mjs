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
    assert.match(decodeURIComponent(url), /"trauma level"/)
    assert.match(decodeURIComponent(url), /"total beds"/)
    assert.match(decodeURIComponent(url), /"teaching hospital"/)
    assert.match(decodeURIComponent(url), /Magnet/)
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
    assert.match(url, /"trauma level"/)
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
})
