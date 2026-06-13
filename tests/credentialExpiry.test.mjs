import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatCredentialExpiryInput,
  isCompleteCredentialExpiry,
  normalizeCredentialExpiry,
} from '../utils/credentialExpiry.ts'

describe('normalizeCredentialExpiry', () => {
  it('accepts MM/YYYY and zero-pads month', () => {
    assert.equal(normalizeCredentialExpiry('6/2026'), '06/2026')
    assert.equal(normalizeCredentialExpiry('06/2026'), '06/2026')
  })

  it('converts ISO dates to MM/YYYY', () => {
    assert.equal(normalizeCredentialExpiry('2026-06-01'), '06/2026')
    assert.equal(normalizeCredentialExpiry('2027-01'), '01/2027')
  })

  it('rejects invalid months', () => {
    assert.equal(normalizeCredentialExpiry('13/2026'), undefined)
    assert.equal(normalizeCredentialExpiry('00/2026'), undefined)
  })
})

describe('formatCredentialExpiryInput', () => {
  it('inserts slash after month digits', () => {
    assert.equal(formatCredentialExpiryInput('062026'), '06/2026')
    assert.equal(formatCredentialExpiryInput('6'), '6')
  })
})

describe('isCompleteCredentialExpiry', () => {
  it('requires full MM/YYYY', () => {
    assert.equal(isCompleteCredentialExpiry('06/2026'), true)
    assert.equal(isCompleteCredentialExpiry('06/20'), false)
    assert.equal(isCompleteCredentialExpiry('2026-06-01'), true)
  })
})
