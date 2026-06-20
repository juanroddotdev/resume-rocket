import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CERTIFICATION_OPTIONS,
  orderedActiveCertificationKeys,
  resolveCanonicalCert,
} from '../utils/certificationOptions.ts'
import {
  buildCertSearchRows,
  filterCertificationGroups,
} from '../utils/certSearch.ts'

describe('CERTIFICATION_OPTIONS', () => {
  it('includes the expanded client catalog without duplicates', () => {
    assert.equal(CERTIFICATION_OPTIONS.length, 29)
    assert.equal(new Set(CERTIFICATION_OPTIONS).size, 29)
    assert.ok(CERTIFICATION_OPTIONS.includes('CCRN'))
    assert.ok(CERTIFICATION_OPTIONS.includes('PBT'))
  })
})

describe('resolveCanonicalCert', () => {
  it('normalizes known acronyms and aliases', () => {
    assert.equal(resolveCanonicalCert('bls'), 'BLS')
    assert.equal(resolveCanonicalCert('Basic Life Support'), 'BLS')
    assert.equal(resolveCanonicalCert('CCRN'), 'CCRN')
  })
})

describe('orderedActiveCertificationKeys', () => {
  it('orders catalog keys before unknown extras', () => {
    assert.deepEqual(
      orderedActiveCertificationKeys(['CUSTOM', 'BLS', 'CCRN']),
      ['BLS', 'CCRN', 'CUSTOM'],
    )
  })
})

describe('filterCertificationGroups', () => {
  it('filters by acronym and category', () => {
    const groups = filterCertificationGroups('critical')
    assert.ok(groups.some(entry => entry.group === 'Critical / emergency nursing'))
    assert.ok(
      groups.some(entry => entry.options.includes('CCRN')),
    )
  })
})

describe('buildCertSearchRows', () => {
  it('excludes already selected certifications', () => {
    const rows = buildCertSearchRows('', new Set(['BLS']))
    assert.ok(rows.every(row => row.value !== 'BLS'))
  })
})
