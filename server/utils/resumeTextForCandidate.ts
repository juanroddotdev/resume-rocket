import { extractTextFromBuffer } from '~/server/utils/extractText'
import { MIN_EXTRACTED_TEXT_CHARS } from '~/server/utils/geminiShared'
import { downloadResumeFile } from '~/server/utils/storageUpload'

const MIN_PROPOSE_RAW_CHARS = MIN_EXTRACTED_TEXT_CHARS

function rawFromParsedResume(parsedResume: unknown): string {
  if (!parsedResume || typeof parsedResume !== 'object' || Array.isArray(parsedResume)) {
    return ''
  }
  const raw = (parsedResume as Record<string, unknown>).raw
  return typeof raw === 'string' ? raw.trim() : ''
}

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lower.endsWith('.doc')) return 'application/msword'
  return 'application/octet-stream'
}

function filenameFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || 'resume.pdf'
}

/**
 * Resume text for admin snapshot propose — prefer stored parse raw, else re-extract from storage.
 */
export async function loadResumeTextForSnapshotPropose(candidate: {
  parsed_resume?: unknown
  resume_storage_path?: string | null
}): Promise<{ text: string; source: 'parsed_resume.raw' | 'storage' }> {
  const stored = rawFromParsedResume(candidate.parsed_resume)
  if (stored.length >= MIN_PROPOSE_RAW_CHARS) {
    return { text: stored, source: 'parsed_resume.raw' }
  }

  const storagePath = candidate.resume_storage_path?.trim()
  if (!storagePath) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No resume text available. Upload a resume first.',
    })
  }

  const buffer = await downloadResumeFile(storagePath)
  const mime = mimeFromPath(storagePath)
  const filename = filenameFromPath(storagePath)
  const text = (await extractTextFromBuffer(buffer, mime, filename)).trim()
  if (text.length < MIN_PROPOSE_RAW_CHARS) {
    throw createError({
      statusCode: 422,
      statusMessage:
        'Could not read enough text from the resume for snapshot proposals. Re-upload a text PDF or continue editing Snapshot manually.',
    })
  }
  return { text, source: 'storage' }
}
