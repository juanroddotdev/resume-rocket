import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EMPLOYER_METRICS_LINE_SEP,
  employerMetricsLineParts,
  formatEmployerMetricsLine,
} from '../utils/employerMetricsLine.ts'

describe('formatEmployerMetricsLine', () => {
  it('joins filled segments in DOCX order', () => {
    assert.equal(
      formatEmployerMetricsLine({
        unitBedCount: '24',
        beds: 500,
        traumaLevel: 'I',
        teachingStatus: true,
        emrSystem: 'Epic',
        patientScope: 'Adult ICU',
      }),
      ['24', '500', 'I', 'Yes', 'Epic', 'Adult ICU'].join(EMPLOYER_METRICS_LINE_SEP),
    )
  })

  it('omits empty slots and maps teaching No', () => {
    assert.equal(
      formatEmployerMetricsLine({
        unitBedCount: '24',
        traumaLevel: 'II',
        teachingStatus: false,
        emrSystem: 'Cerner',
      }),
      '24 • II • No • Cerner',
    )
  })

  it('falls back to legacy EMR when employer EMR is empty', () => {
    assert.equal(
      formatEmployerMetricsLine(
        { beds: 450, traumaLevel: 'I' },
        { legacyEmrSystem: 'Epic' },
      ),
      '450 • I • Epic',
    )
  })

  it('returns empty when nothing is set', () => {
    assert.equal(formatEmployerMetricsLine({}), '')
  })
})

describe('employerMetricsLineParts', () => {
  it('keeps six ordered slots including blanks', () => {
    assert.deepEqual(
      employerMetricsLineParts({
        unitBedCount: '24',
        teachingStatus: true,
      }),
      ['24', '', '', 'Yes', '', ''],
    )
  })
})
