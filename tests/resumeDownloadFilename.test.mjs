import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildResumeDownloadFilename,
  contentDispositionAttachment,
  parseContentDispositionFilename,
} from '../utils/resumeDownloadFilename.ts'

describe('buildResumeDownloadFilename', () => {
  it('uses LastName_FirstName_VMS-Resume.docx when both names exist', () => {
    assert.equal(
      buildResumeDownloadFilename({ firstName: 'Allison', lastName: 'Coon' }),
      'Coon_Allison_VMS-Resume.docx',
    )
  })

  it('sanitizes invalid filesystem characters and spaces', () => {
    assert.equal(
      buildResumeDownloadFilename({ firstName: 'Mary/Jane', lastName: 'O Connor' }),
      'O_Connor_MaryJane_VMS-Resume.docx',
    )
  })

  it('falls back to last name only', () => {
    assert.equal(buildResumeDownloadFilename({ lastName: 'Coon' }), 'Coon_VMS-Resume.docx')
  })

  it('falls back to first name only', () => {
    assert.equal(buildResumeDownloadFilename({ firstName: 'Allison' }), 'Allison_VMS-Resume.docx')
  })

  it('uses generic name when both names are blank', () => {
    assert.equal(buildResumeDownloadFilename({}), 'VMS-Resume.docx')
    assert.equal(buildResumeDownloadFilename({ firstName: '  ', lastName: '' }), 'VMS-Resume.docx')
  })
})

describe('contentDispositionAttachment', () => {
  it('wraps filename in attachment header', () => {
    assert.equal(
      contentDispositionAttachment('Coon_Allison_VMS-Resume.docx'),
      'attachment; filename="Coon_Allison_VMS-Resume.docx"',
    )
  })
})

describe('parseContentDispositionFilename', () => {
  it('reads quoted filename values', () => {
    assert.equal(
      parseContentDispositionFilename('attachment; filename="Coon_Allison_VMS-Resume.docx"'),
      'Coon_Allison_VMS-Resume.docx',
    )
  })

  it('returns null for missing header', () => {
    assert.equal(parseContentDispositionFilename(null), null)
  })
})
