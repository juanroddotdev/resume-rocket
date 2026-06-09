import {
  buildResumeDownloadFilename,
  parseContentDispositionFilename,
  triggerBlobDownload,
} from '~/utils/resumeDownloadFilename'

type DownloadResumeDocxOptions = {
  body: Record<string, unknown>
  headers?: Record<string, string>
  firstName?: string | null
  lastName?: string | null
}

export async function downloadResumeDocxFromApi(options: DownloadResumeDocxOptions): Promise<void> {
  const fallbackFilename = buildResumeDownloadFilename({
    firstName: options.firstName,
    lastName: options.lastName,
  })

  const res = await fetch('/api/generate-docx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(options.body),
  })

  if (!res.ok) {
    let message = 'Could not download DOCX.'
    try {
      const data = (await res.json()) as { statusMessage?: string; message?: string }
      message = data.statusMessage || data.message || message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }

  const disposition = res.headers.get('Content-Disposition')
  const filename = parseContentDispositionFilename(disposition) ?? fallbackFilename
  const blob = await res.blob()
  triggerBlobDownload(blob, filename)
}
