export interface ParseOutcomeLogInput {
  candidateId: string
  mime: string
  charCount: number
  parseFailed: boolean
  partialParse: boolean
  documentScan: boolean
  geminiFailed: boolean
  fieldsFound: number
  parseErrorKind?: string
}

/** Classify parse errors without logging resume text or PII. */
export function classifyParseError(message: string | null | undefined): string | undefined {
  if (!message?.trim()) return undefined
  const m = message.toLowerCase()
  if (m.includes('gemini_api_key') || m.includes('visual scanning') || m.includes('image-based')) {
    return 'vision_required'
  }
  if (m.includes('no text extracted')) return 'no_text'
  if (m.includes('ai parse') || m.includes('gemini')) return 'gemini_error'
  if (m.includes('only pdf and docx')) return 'unsupported_mime'
  if (m.includes('10mb')) return 'file_too_large'
  return 'other'
}

/** PHI-safe structured log for parse outcome classification. */
export function logParseOutcome(input: ParseOutcomeLogInput) {
  const payload: Record<string, unknown> = {
    event: 'parse_outcome',
    candidateId: input.candidateId,
    mime: input.mime,
    charCount: input.charCount,
    parse_failed: input.parseFailed,
    partial_parse: input.partialParse,
    document_scan: input.documentScan,
    geminiFailed: input.geminiFailed,
    fields_found: input.fieldsFound,
  }
  if (input.parseErrorKind) payload.parse_error_kind = input.parseErrorKind

  console.info(JSON.stringify(payload))
}
