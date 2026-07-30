import mammoth from 'mammoth'

const PDF_MIMES = ['application/pdf']
const DOCX_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

export function isAllowedResumeMime(mime: string, filename = '') {
  if (PDF_MIMES.includes(mime) || DOCX_MIMES.includes(mime)) return true
  const lower = filename.toLowerCase()
  return lower.endsWith('.pdf') || lower.endsWith('.docx')
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string,
  filename: string,
): Promise<string> {
  if (PDF_MIMES.includes(mime) || filename.toLowerCase().endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return (result.text || '').trim()
  }

  if (DOCX_MIMES.includes(mime) || filename.toLowerCase().endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer })
    return (result.value || '').trim()
  }

  throw createError({
    statusCode: 415,
    statusMessage: 'Only PDF and DOCX files are supported',
  })
}
