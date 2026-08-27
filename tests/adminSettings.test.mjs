import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildLookupTemplateUrl,
  DEFAULT_APP_SETTINGS,
  formatUploadSize,
  isAllowedConfiguredUpload,
  normalizeAppSettings,
  uploadAcceptAttribute,
} from '../utils/adminSettings.ts'

describe('admin settings helpers', () => {
  it('normalizes missing settings to safe defaults', () => {
    const settings = normalizeAppSettings({})
    assert.equal(settings.default_invite_expiration_days, 7)
    assert.equal(settings.max_upload_bytes, 10 * 1024 * 1024)
    assert.deepEqual(settings.allowed_upload_mime_types, DEFAULT_APP_SETTINGS.allowed_upload_mime_types)
  })

  it('formats upload limits for UI and server errors', () => {
    assert.equal(formatUploadSize(10 * 1024 * 1024), '10MB')
    assert.equal(formatUploadSize(1.5 * 1024 * 1024), '1.5MB')
  })

  it('builds accept attributes from enabled MIME types', () => {
    assert.equal(uploadAcceptAttribute(['application/pdf']), 'application/pdf,.pdf')
  })

  it('allows unknown MIME only when the enabled extension matches', () => {
    assert.equal(
      isAllowedConfiguredUpload('application/octet-stream', 'resume.pdf', ['application/pdf']),
      true,
    )
    assert.equal(
      isAllowedConfiguredUpload('application/octet-stream', 'resume.docx', ['application/pdf']),
      false,
    )
  })

  it('fills lookup templates with encoded placeholder values', () => {
    const url = buildLookupTemplateUrl(
      'https://www.google.com/search?q={facilityName}+{city}+{state}',
      { facilityName: 'Metro General', city: 'Austin', state: 'TX' },
    )
    assert.equal(url, 'https://www.google.com/search?q=Metro%20General+Austin+TX')
  })
})
