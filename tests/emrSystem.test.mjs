import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EMR_CHARTING_GROUP_LABELS, EMR_CHARTING_GROUPS } from '../utils/emrChartingSystems.ts'
import {
  EMR_OTHER_OPTION,
  EMR_PRESET_OPTIONS,
  emrSystemFromFields,
  isEmrComplete,
  resolveEmrFields,
} from '../utils/emrSystem.ts'

describe('EMR charting presets', () => {
  it('includes grouped options from every category', () => {
    assert.ok(EMR_PRESET_OPTIONS.includes('Epic'))
    assert.ok(EMR_PRESET_OPTIONS.includes('GE PACS'))
    assert.ok(EMR_PRESET_OPTIONS.includes('Homecare Homebase (HCHB)'))
    assert.equal(
      EMR_CHARTING_GROUP_LABELS.length,
      Object.keys(EMR_CHARTING_GROUPS).length,
    )
  })

  it('has no duplicate preset labels', () => {
    assert.equal(EMR_PRESET_OPTIONS.length, new Set(EMR_PRESET_OPTIONS).size)
  })
})

describe('resolveEmrFields', () => {
  it('returns empty selection for blank values', () => {
    assert.deepEqual(resolveEmrFields(''), { selection: '', custom: '' })
    assert.deepEqual(resolveEmrFields(null), { selection: '', custom: '' })
  })

  it('maps presets directly', () => {
    assert.deepEqual(resolveEmrFields('Epic'), { selection: 'Epic', custom: '' })
    assert.deepEqual(resolveEmrFields('Allscripts Sunrise'), {
      selection: 'Allscripts Sunrise',
      custom: '',
    })
    assert.deepEqual(resolveEmrFields('GE LOGIQ'), { selection: 'GE LOGIQ', custom: '' })
  })

  it('maps legacy stored values to current presets', () => {
    assert.deepEqual(resolveEmrFields('Cerner / Millennium'), {
      selection: 'Cerner / Oracle Health Millennium',
      custom: '',
    })
    assert.deepEqual(resolveEmrFields('Homecare Homebase'), {
      selection: 'Homecare Homebase (HCHB)',
      custom: '',
    })
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
    assert.equal(
      emrSystemFromFields('Cerner / Oracle Health Millennium', ''),
      'Cerner / Oracle Health Millennium',
    )
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
