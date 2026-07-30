import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inviteValidateFailure } from '../utils/inviteValidateFailure.ts'

describe('inviteValidateFailure (S1-M1)', () => {
  it('returns only valid:false and reason — no PII keys', () => {
    for (const reason of ['missing', 'invalid', 'expired', 'revoked', 'completed']) {
      const body = inviteValidateFailure(reason)
      assert.deepEqual(body, { valid: false, reason })
      assert.equal('candidate_email' in body, false)
      assert.equal('candidate_first_name' in body, false)
      assert.equal('candidate_last_name' in body, false)
    }
  })
})
