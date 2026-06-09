const MAX_NAME_PART_LENGTH = 40
const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g

function sanitizeNamePart(value?: string | null): string {
  return (value ?? '')
    .trim()
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, MAX_NAME_PART_LENGTH)
}

/** e.g. Coon_Allison_VMS-Resume.docx */
export function buildResumeDownloadFilename(input: {
  firstName?: string | null
  lastName?: string | null
}): string {
  const first = sanitizeNamePart(input.firstName)
  const last = sanitizeNamePart(input.lastName)

  if (last && first) return `${last}_${first}_VMS-Resume.docx`
  if (last) return `${last}_VMS-Resume.docx`
  if (first) return `${first}_VMS-Resume.docx`
  return 'VMS-Resume.docx'
}

export function contentDispositionAttachment(filename: string): string {
  const safe = filename.replace(/"/g, '')
  return `attachment; filename="${safe}"`
}

export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null

  const encoded = header.match(/filename\*=(?:UTF-8''|utf-8'')([^;\s]+)/i)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].replace(/"/g, ''))
    } catch {
      /* fall through */
    }
  }

  const quoted = header.match(/filename="([^"]+)"/i)
  if (quoted) return quoted[1]

  const unquoted = header.match(/filename=([^;\s]+)/i)
  if (unquoted) return unquoted[1].replace(/"/g, '')

  return null
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
