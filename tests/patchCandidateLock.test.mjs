import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isCandidatePatchLocked } from '../utils/candidatePatchLock.ts'

describe('isCandidatePatchLocked (S5-H1)', () => {
  it('allows draft and unknown statuses', () => {
    assert.equal(isCandidatePatchLocked('draft'), false)
    assert.equal(isCandidatePatchLocked(null), false)
    assert.equal(isCandidatePatchLocked(undefined), false)
    assert.equal(isCandidatePatchLocked('archived'), false)
  })

  it('locks submitted and confirmed', () => {
    assert.equal(isCandidatePatchLocked('submitted'), true)
    assert.equal(isCandidatePatchLocked('confirmed'), true)
  })
})
