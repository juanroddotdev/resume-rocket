import PizZip from 'pizzip'
import {
  buildResumeDocx,
  mapCandidateToTemplateData,
} from '../../server/utils/docxBuilder.ts'

/** Flatten DOCX document.xml to a single searchable string. */
export function packetTextFromBuffer(buffer) {
  const zip = new PizZip(buffer)
  const xml = zip.file('word/document.xml')?.asText() || ''
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function countPhrase(haystack, needle) {
  if (!needle) return 0
  let count = 0
  let from = 0
  while (from < haystack.length) {
    const index = haystack.indexOf(needle, from)
    if (index === -1) break
    count += 1
    from = index + needle.length
  }
  return count
}

/** Render one candidate to packet text + template map. */
export async function packetFor(candidate) {
  const data = mapCandidateToTemplateData(candidate)
  const buffer = await buildResumeDocx(candidate)
  return { data, text: packetTextFromBuffer(buffer) }
}
