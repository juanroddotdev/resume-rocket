import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { IncomingMessage, ServerResponse } from 'node:http'
import { createEvent } from 'h3'
import { getInviteTokenFromEvent } from '../server/utils/requireInvite.ts'

/** Mimic Node HTTP: header names are lowercased on the IncomingMessage. */
function mockEvent(headers = {}) {
  const req = new IncomingMessage({ socket: {} })
  const normalized = {}
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value
  }
  req.headers = normalized
  const res = new ServerResponse(req)
  return createEvent(req, res)
}

describe('getInviteTokenFromEvent', () => {
  it('returns null when no invite token is present', () => {
    assert.equal(getInviteTokenFromEvent(mockEvent()), null)
  })

  it('returns null when headers object is empty', () => {
    assert.equal(getInviteTokenFromEvent(mockEvent({})), null)
  })

  it('reads x-intake-token header', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': 'invite-abc' })),
      'invite-abc',
    )
  })

  it('reads header case-insensitively', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'X-Intake-Token': 'case-mixed' })),
      'case-mixed',
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

  it('falls back to intake_token cookie when header is missing', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ cookie: 'intake_token=cookie-only' })),
      'cookie-only',
    )
  })

  it('falls through empty-string header to cookie', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        'x-intake-token': '',
        cookie: 'intake_token=from-cookie',
      })),
      'from-cookie',
    )
  })

  it('returns null for empty-string header and no cookie', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': '' })),
      null,
    )
  })

  it('returns null for empty cookie value', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ cookie: 'intake_token=' })),
      null,
    )
  })

  it('ignores unrelated cookies', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        cookie: 'session=abc; other=xyz; not_intake=nope',
      })),
      null,
    )
  })

  it('reads intake_token among other cookies', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        cookie: 'session=abc; intake_token=real-token; other=xyz',
      })),
      'real-token',
    )
  })

  it('does not treat a similarly named cookie as the invite token', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        cookie: 'intake_token_backup=wrong; x-intake-token=also-wrong',
      })),
      null,
    )
  })

  it('returns whitespace-only header as-is (truthy, no trim)', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': '   ' })),
      '   ',
    )
  })

  it('accepts long token strings', () => {
    const longToken = `tok-${'a'.repeat(512)}`
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': longToken })),
      longToken,
    )
  })

  it('preserves special characters in header token', () => {
    const special = 'tok_./+-:=~!@#$%^*()'
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': special })),
      special,
    )
  })

  it('preserves unicode in header token', () => {
    const unicode = 'invite-トークン-🔐'
    assert.equal(
      getInviteTokenFromEvent(mockEvent({ 'x-intake-token': unicode })),
      unicode,
    )
  })

  it('ignores authorization bearer when invite header/cookie absent', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        authorization: 'Bearer admin-jwt-not-an-invite',
      })),
      null,
    )
  })

  it('does not read token from query-like header names', () => {
    assert.equal(
      getInviteTokenFromEvent(mockEvent({
        token: 'query-style',
        'intake-token': 'almost',
      })),
      null,
    )
  })
})
