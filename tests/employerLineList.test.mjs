import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { arrayToLines, linesToArray } from '../utils/employerLineList.ts'

describe('employerLineList', () => {
  it('preserves internal newlines until commit trim', () => {
    assert.deepEqual(linesToArray('ICU ER\nStep-down'), ['ICU ER', 'Step-down'])
  })

  it('trims trailing spaces on commit only', () => {
    assert.deepEqual(linesToArray('ICU \n ER '), ['ICU', 'ER'])
  })

  it('joins arrays for textarea display', () => {
    assert.equal(arrayToLines(['ICU', 'ER']), 'ICU\nER')
  })
})
