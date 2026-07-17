import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EMPLOYER_METRICS_LINE_SEP,
  employerMetricsLineParts,
  formatEmployerMetricsLine,
} from '../utils/employerMetricsLine.ts'

describe('formatEmployerMetricsLine', () => {
  it('joins labeled segments in DOCX order', () => {
    assert.equal(
      formatEmployerMetricsLine({
        unitBedCount: '24',
        beds: 500,
        traumaLevel: 'I',
        teachingStatus: true,
        magnetStatus: true,
        emrSystem: 'Epic',
        patientScope: 'Adult ICU',
      }),
      [
        '24 unit beds',
        '500 hospital beds',
        'Trauma I',
        'Teaching Yes',
        'Magnet Yes',
        'EMR Epic',
        'Adult ICU',
      ].join(EMPLOYER_METRICS_LINE_SEP),
    )
  })

  it('omits empty slots and maps teaching/Magnet No', () => {
    assert.equal(
      formatEmployerMetricsLine({
        unitBedCount: '24',
        traumaLevel: 'II',
        teachingStatus: false,
        magnetStatus: false,
        emrSystem: 'Cerner',
      }),
      '24 unit beds • Trauma II • Teaching No • Magnet No • EMR Cerner',
    )
  })

  it('falls back to legacy EMR when employer EMR is empty', () => {
    assert.equal(
      formatEmployerMetricsLine(
        { beds: 450, traumaLevel: 'I' },
        { legacyEmrSystem: 'Epic' },
      ),
      '450 hospital beds • Trauma I • EMR Epic',
    )
  })

  it('does not double-label values that already include a label', () => {
    assert.equal(
      formatEmployerMetricsLine({
        unitBedCount: '24 unit beds',
        traumaLevel: 'Level I',
        emrSystem: 'EMR Epic',
      }),
      '24 unit beds • Level I • EMR Epic',
    )
  })

  it('returns empty when nothing is set', () => {
    assert.equal(formatEmployerMetricsLine({}), '')
  })
})

describe('employerMetricsLineParts', () => {
  it('keeps seven ordered labeled slots including blanks', () => {
    assert.deepEqual(
      employerMetricsLineParts({
        unitBedCount: '24',
        teachingStatus: true,
        magnetStatus: true,
      }),
      ['24 unit beds', '', '', 'Teaching Yes', 'Magnet Yes', '', ''],
    )
  })
})
