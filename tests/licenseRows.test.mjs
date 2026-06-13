import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  activeLicensesListForDocx,
  hasCompleteLicense,
  licensesFromLegacyScalars,
  resolveCandidateLicenses,
} from '../utils/licenseRows.ts'

describe('licenseRows', () => {
  it('synthesizes licenses from legacy scalar columns', () => {
    const rows = licensesFromLegacyScalars('CA', 'RN-123')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].state, 'CA')
    assert.equal(rows[0].number, 'RN-123')
  })

  it('prefers JSONB licenses over legacy scalars', () => {
    const rows = resolveCandidateLicenses({
      licenses: [{ state: 'TX', number: 'RN-9' }],
      license_state: 'CA',
      license_number: 'RN-1',
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0].state, 'TX')
  })

  it('formats active license list for DOCX', () => {
    const list = activeLicensesListForDocx([
      { state: 'CA', number: 'RN-1', expiry: '06/2027' },
    ])
    assert.deepEqual(list, ['CA · RN-1 · 06/2027'])
  })

  it('detects complete license rows for gap review', () => {
    assert.equal(hasCompleteLicense([{ state: 'CA' }]), false)
    assert.equal(hasCompleteLicense([{ state: 'CA', number: 'RN-1' }]), true)
  })
})
