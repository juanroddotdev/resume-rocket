import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { IncomingMessage, ServerResponse } from 'node:http'
import { createEvent } from 'h3'
import { getInviteTokenFromEvent } from '../server/utils/requireInvite.ts'

function mockEvent(headers = {}) {
  const req = new IncomingMessage({ socket: {} })
  req.headers = headers
  const res = new ServerResponse(req)
  return createEvent(req, res)
}

describe('getInviteTokenFromEvent', () => {
  it('returns null when no invite token is present', () => {
    assert.equal(getInviteTokenFromEvent(mockEvent()), null)
  })

  it('reads x-intake-token header', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': 'invite-abc' })),
      'invite-abc',
    )
  })

  it('prefers header over cookie', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        'x-intake-token': 'from-header',
        cookie: 'intake_token=from-cookie',
      })),
      'from-header',
    )
  })
})
