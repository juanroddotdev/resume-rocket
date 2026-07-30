import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAllowedStatusPatch } from '../utils/candidateStatusPatch.ts'

describe('isAllowedStatusPatch (S5-M1)', () => {
  it('allows field-only patches with no status', () => {
    assert.equal(isAllowedStatusPatch('draft', undefined), true)
    assert.equal(isAllowedStatusPatch('submitted', undefined), true)
  })

  it('allows draft → submitted', () => {
    assert.equal(isAllowedStatusPatch('draft', 'submitted'), true)
  })

  it('rejects confirmed, archived, and draft status via PATCH', () => {
    assert.equal(isAllowedStatusPatch('draft', 'confirmed'), false)
    assert.equal(isAllowedStatusPatch('draft', 'archived'), false)
    assert.equal(isAllowedStatusPatch('draft', 'draft'), false)
  })

  it('rejects submit from non-draft rows', () => {
    assert.equal(isAllowedStatusPatch('submitted', 'submitted'), false)
    assert.equal(isAllowedStatusPatch('confirmed', 'submitted'), false)
    assert.equal(isAllowedStatusPatch('archived', 'submitted'), false)
    assert.equal(isAllowedStatusPatch(null, 'submitted'), false)
  })
})
