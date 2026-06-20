import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildEmrSearchRows,
  filterEmrChartingGroups,
  findCanonicalEmrPreset,
} from '../utils/emrSearch.ts'

describe('findCanonicalEmrPreset', () => {
  it('matches presets case-insensitively', () => {
    assert.equal(findCanonicalEmrPreset('epic'), 'Epic')
    assert.equal(findCanonicalEmrPreset('GE PACS'), 'GE PACS')
  })
})

describe('filterEmrChartingGroups', () => {
  it('returns all groups for empty query', () => {
    const groups = filterEmrChartingGroups('')
    assert.ok(groups.length >= 20)
    assert.ok(groups.some(entry => entry.group === 'Hospital EMRs'))
  })

  it('filters by system name', () => {
    const groups = filterEmrChartingGroups('GE PACS')
    assert.equal(groups.length, 1)
    assert.equal(groups[0]?.group, 'PACS (Imaging)')
    assert.deepEqual(groups[0]?.options, ['GE PACS'])
  })

  it('filters by category label', () => {
    const groups = filterEmrChartingGroups('home health')
    assert.ok(groups.some(entry => entry.group === 'Home Health & Hospice'))
  })

  it('matches shorthand aliases', () => {
    const groups = filterEmrChartingGroups('millennium')
    assert.ok(
      groups.some(entry =>
        entry.options.includes('Cerner / Oracle Health Millennium'),
      ),
    )
  })
})

describe('buildEmrSearchRows', () => {
  it('adds custom row when query does not match a preset', () => {
    const rows = buildEmrSearchRows('Athena')
    assert.equal(rows[0]?.type, 'custom')
    assert.equal(rows[0]?.value, 'Athena')
  })

  it('omits custom row when query matches a preset', () => {
    const rows = buildEmrSearchRows('Epic')
    assert.ok(rows.every(row => row.type !== 'custom'))
    assert.ok(rows.some(row => row.type === 'option' && row.value === 'Epic'))
  })
})
