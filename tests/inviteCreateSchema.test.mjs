/**
 * Unit tests for invite create schema (named intake create).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { inviteCreateSchema } from '../utils/inviteCreateSchema.ts'

describe('inviteCreateSchema', () => {
  it('allows invites without names (upload/scratch drafts)', () => {
    const parsed = inviteCreateSchema.parse({ expires_in_days: 7 })
    assert.equal(parsed.candidate_first_name, undefined)
    assert.equal(parsed.candidate_last_name, undefined)
  })

  it('treats empty names as undefined', () => {
    const parsed = inviteCreateSchema.parse({
      candidate_first_name: '  ',
      candidate_last_name: '',
      expires_in_days: 7,
    })
    assert.equal(parsed.candidate_first_name, undefined)
    assert.equal(parsed.candidate_last_name, undefined)
  })

  it('accepts names without email', () => {
    const parsed = inviteCreateSchema.parse({
      candidate_first_name: '  Jane ',
      candidate_last_name: ' Doe',
      expires_in_days: 7,
    })
    assert.equal(parsed.candidate_first_name, 'Jane')
    assert.equal(parsed.candidate_last_name, 'Doe')
    assert.equal(parsed.candidate_email, undefined)
  })

  it('treats empty email as undefined', () => {
    const parsed = inviteCreateSchema.parse({
      candidate_first_name: 'Jane',
      candidate_last_name: 'Doe',
      candidate_email: '   ',
      expires_in_days: 7,
    })
    assert.equal(parsed.candidate_email, undefined)
  })

  it('rejects invalid email when provided', () => {
    assert.throws(() =>
      inviteCreateSchema.parse({
        candidate_first_name: 'Jane',
        candidate_last_name: 'Doe',
        candidate_email: 'not-an-email',
        expires_in_days: 7,
      }),
    )
  })

  it('accepts valid optional email', () => {
    const parsed = inviteCreateSchema.parse({
      candidate_first_name: 'Jane',
      candidate_last_name: 'Doe',
      candidate_email: ' jane@example.com ',
      expires_in_days: 7,
    })
    assert.equal(parsed.candidate_email, 'jane@example.com')
  })
})
