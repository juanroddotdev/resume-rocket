type FetchPreviewDocxOptions = {
  body: Record<string, unknown>
  headers?: Record<string, string>
}

/** Fetch generated DOCX bytes for in-browser preview (does not trigger download). */
export async function fetchPreviewDocx(options: FetchPreviewDocxOptions): Promise<ArrayBuffer> {
  const res = await fetch('/api/generate-docx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(options.body),
  })

  if (!res.ok) {
    let message = 'Could not generate preview.'
    try {
      const data = (await res.json()) as { statusMessage?: string; message?: string }
      message = data.statusMessage || data.message || message
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message)
  }

  return res.arrayBuffer()
}
