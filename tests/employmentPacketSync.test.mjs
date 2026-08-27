import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { employmentPacketSyncMessage } from '../utils/employmentPacketSync.ts'

describe('employmentPacketSyncMessage', () => {
  it('uses snapshot wording for admin', () => {
    assert.match(employmentPacketSyncMessage('admin'), /Professional Snapshot/)
  })

  it('uses preview wording for intake', () => {
    assert.match(employmentPacketSyncMessage('intake'), /preview packet/i)
  })
})
