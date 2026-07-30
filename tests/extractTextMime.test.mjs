import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAllowedResumeMime } from '../server/utils/extractText.ts'

describe('isAllowedResumeMime (S2-M4)', () => {
  it('allows standard PDF and DOCX MIME types', () => {
    assert.equal(isAllowedResumeMime('application/pdf'), true)
    assert.equal(
      isAllowedResumeMime(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
      true,
    )
  })

  it('allows octet-stream when filename ends with .pdf or .docx', () => {
    assert.equal(isAllowedResumeMime('application/octet-stream', 'resume.PDF'), true)
    assert.equal(isAllowedResumeMime('application/octet-stream', 'packet.docx'), true)
  })

  it('rejects unknown MIME without a resume extension', () => {
    assert.equal(isAllowedResumeMime('application/octet-stream', 'notes.txt'), false)
    assert.equal(isAllowedResumeMime('text/plain', 'resume.pdf.bak'), false)
  })
})
