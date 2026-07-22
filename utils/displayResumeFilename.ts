/**
 * Shorten storage-style resume names for UI (strip trailing _hex hashes).
 * Full original stays available via title/tooltip.
 */
export function displayResumeFilename(filename: string, maxLength = 28): string {
  const trimmed = filename.trim()
  if (!trimmed) return ''

  const lastDot = trimmed.lastIndexOf('.')
  const hasExt = lastDot > 0 && lastDot < trimmed.length - 1
  const base = hasExt ? trimmed.slice(0, lastDot) : trimmed
  const ext = hasExt ? trimmed.slice(lastDot) : ''

  // e.g. preeti-kumar-resume_a43d2849f445231e75a07f804d → preeti-kumar-resume
  const withoutHash = base.replace(/_[a-f0-9]{8,}$/i, '')
  const cleaned = `${withoutHash || base}${ext}`

  if (cleaned.length <= maxLength) return cleaned
  if (!ext) return `${cleaned.slice(0, Math.max(1, maxLength - 1))}…`

  const budget = Math.max(1, maxLength - ext.length - 1)
  return `${cleaned.slice(0, budget)}…${ext}`
}
