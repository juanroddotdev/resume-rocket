import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

/**
 * Mirror of server/utils/platformAdmin.ts for node:test without Nuxt aliases.
 * Keep in sync with that file.
 */
function getPlatformAdminEmails(envValue) {
  const raw = envValue || ''
  return raw
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

function isPlatformAdmin(user, envValue) {
  const email = user.email?.trim().toLowerCase()
  if (!email) return false
  return getPlatformAdminEmails(envValue).includes(email)
}

describe('isPlatformAdmin', () => {
  it('matches allowlisted email case-insensitively', () => {
    assert.equal(
      isPlatformAdmin({ email: 'Juan@JuanRod.dev' }, 'juan@juanrod.dev'),
      true,
    )
  })

  it('supports comma-separated allowlist', () => {
    assert.equal(
      isPlatformAdmin({ email: 'other@example.com' }, 'juan@juanrod.dev, other@example.com'),
      true,
    )
  })

  it('rejects non-allowlisted emails', () => {
    assert.equal(
      isPlatformAdmin({ email: 'recruiter@client.com' }, 'juan@juanrod.dev'),
      false,
    )
  })

  it('rejects when allowlist empty', () => {
    assert.equal(isPlatformAdmin({ email: 'juan@juanrod.dev' }, ''), false)
    assert.equal(isPlatformAdmin({ email: 'juan@juanrod.dev' }, undefined), false)
  })
})
