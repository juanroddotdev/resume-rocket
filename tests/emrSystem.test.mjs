import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EMR_OTHER_OPTION,
  emrSystemFromFields,
  isEmrComplete,
  resolveEmrFields,
} from '../utils/emrSystem.ts'

describe('resolveEmrFields', () => {
  it('returns empty selection for blank values', () => {
    assert.deepEqual(resolveEmrFields(''), { selection: '', custom: '' })
    assert.deepEqual(resolveEmrFields(null), { selection: '', custom: '' })
  })

  it('maps presets directly', () => {
    assert.deepEqual(resolveEmrFields('Epic'), { selection: 'Epic', custom: '' })
    assert.deepEqual(resolveEmrFields('Allscripts'), { selection: 'Allscripts', custom: '' })
  })

  it('maps unknown values to Other with custom text', () => {
    assert.deepEqual(resolveEmrFields('Custom EMR'), {
      selection: EMR_OTHER_OPTION,
      custom: 'Custom EMR',
    })
  })
})

describe('emrSystemFromFields', () => {
  it('stores preset values unchanged', () => {
    assert.equal(emrSystemFromFields('Cerner', ''), 'Cerner')
  })

  it('stores trimmed custom text for Other', () => {
    assert.equal(emrSystemFromFields(EMR_OTHER_OPTION, '  Medhost  '), 'Medhost')
  })

  it('does not persist literal Other without custom text', () => {
    assert.equal(emrSystemFromFields(EMR_OTHER_OPTION, ''), '')
  })
})

describe('isEmrComplete', () => {
  it('requires custom text when Other is selected', () => {
    assert.equal(isEmrComplete(EMR_OTHER_OPTION, ''), false)
    assert.equal(isEmrComplete(EMR_OTHER_OPTION, 'Athena'), true)
  })

  it('accepts presets without custom text', () => {
    assert.equal(isEmrComplete('Epic', ''), true)
  })
})
