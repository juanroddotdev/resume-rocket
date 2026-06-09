import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createManualEmployer,
  isDuplicateEmployerEntry,
  normalizeEmployerKey,
} from '../utils/employerLink.ts'

describe('createManualEmployer', () => {
  it('trims name and optional location fields', () => {
    assert.deepEqual(
      createManualEmployer({ name: '  St. Mary  ', city: ' Austin ', state: ' tx ' }),
      { name: 'St. Mary', city: 'Austin', state: 'tx' },
    )
  })

  it('omits empty city and state', () => {
    const entry = createManualEmployer({ name: 'Regional Medical' })
    assert.equal(entry.name, 'Regional Medical')
    assert.equal(entry.city, undefined)
    assert.equal(entry.state, undefined)
  })
})

describe('isDuplicateEmployerEntry', () => {
  const existing = [
    { name: 'General Hospital', city: 'Austin' },
    { name: 'Linked Hospital', city: 'Dallas', hospitalId: 'abc' },
  ]

  it('detects duplicate by normalized name and city', () => {
    assert.equal(
      isDuplicateEmployerEntry(existing, { name: 'general hospital', city: 'Austin' }),
      true,
    )
  })

  it('detects duplicate hospitalId', () => {
    assert.equal(
      isDuplicateEmployerEntry(existing, {
        name: 'Other',
        hospitalId: 'abc',
      }),
      true,
    )
  })

  it('allows same name with different city', () => {
    assert.equal(
      isDuplicateEmployerEntry(existing, { name: 'General Hospital', city: 'Houston' }),
      false,
    )
  })

  it('can exclude an index when editing in place', () => {
    assert.equal(
      isDuplicateEmployerEntry(existing, { name: 'General Hospital', city: 'Austin' }, { excludeIndex: 0 }),
      false,
    )
  })
})

describe('normalizeEmployerKey', () => {
  it('lowercases name and city', () => {
    assert.equal(
      normalizeEmployerKey({ name: 'Memorial', city: 'SA' }),
      'memorial|sa',
    )
  })
})
