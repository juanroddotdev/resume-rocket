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

  it('appends Compact on the primary license when status is Yes', () => {
    const list = activeLicensesListForDocx(
      [
        { state: 'TX', number: 'RN-1', expiry: '06/2027' },
        { state: 'CA', number: 'RN-2' },
      ],
      'Yes',
    )
    assert.deepEqual(list, [
      'TX · RN-1 · 06/2027 · Compact',
      'CA · RN-2',
    ])
  })

  it('marks Compact on the first complete license, not an incomplete earlier row', () => {
    const list = activeLicensesListForDocx(
      [{ state: 'TX' }, { state: 'CA', number: 'RN-2' }],
      'Yes',
    )
    assert.deepEqual(list, ['TX', 'CA · RN-2 · Compact'])
  })

  it('does not print Compact for No, N/A, or incomplete primary rows', () => {
    const rows = [
      { state: 'TX', number: 'RN-1' },
      { state: 'CA', number: 'RN-2' },
    ]
    assert.deepEqual(activeLicensesListForDocx(rows, 'No'), [
      'TX · RN-1',
      'CA · RN-2',
    ])
    assert.deepEqual(activeLicensesListForDocx(rows, 'N/A'), [
      'TX · RN-1',
      'CA · RN-2',
    ])
    assert.deepEqual(
      activeLicensesListForDocx([{ state: 'TX' }], 'Yes'),
      ['TX'],
    )
  })

  it('detects complete license rows for gap review', () => {
    assert.equal(hasCompleteLicense([{ state: 'CA' }]), false)
    assert.equal(hasCompleteLicense([{ state: 'CA', number: 'RN-1' }]), true)
  })
})
