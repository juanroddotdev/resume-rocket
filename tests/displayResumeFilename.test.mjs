import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { displayResumeFilename } from '../utils/displayResumeFilename.ts'

describe('displayResumeFilename', () => {
  it('strips trailing hex hash before extension', () => {
    assert.equal(
      displayResumeFilename('preeti-kumar-resume_a43d2849f445231e75a07f804d.pdf'),
      'preeti-kumar-resume.pdf',
    )
  })

  it('ellipsis long names while keeping extension', () => {
    const result = displayResumeFilename(
      'very-long-candidate-resume-name-without-hash.pdf',
      24,
    )
    assert.match(result, /\.pdf$/)
    assert.ok(result.includes('…'))
    assert.ok(result.length <= 24)
  })

  it('returns short names unchanged', () => {
    assert.equal(displayResumeFilename('resume.pdf'), 'resume.pdf')
  })
})
