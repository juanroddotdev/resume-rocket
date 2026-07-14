/**
 * Automated DOCX template smoke — July 2026 contract (Professional Snapshot).
 * Generates a fixture DOCX, inspects word/*.xml for broken tags and expected content.
 *
 * Usage: node scripts/smoke-docx-template.mjs [--out /path/to/file.docx]
 *
 * Pair with a quick visual pass in Pages or LibreOffice (Word not required).
 * See docs/MANUAL-TEST-CHECKLIST.md § I.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import PizZip from 'pizzip'
import { buildResumeDocx } from '../server/utils/docxBuilder.ts'
import { completeDocxFixture } from './fixtures/complete-docx-candidate.mjs'

const outArg = process.argv.indexOf('--out')
const outPath = outArg >= 0 ? process.argv[outArg + 1] : join('/tmp', 'resume-rocket-smoke.docx')

const XML_PARTS = /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/
const LEFTOVER_TAG_RE = /\{[#/]?[^{}]+\}/g

function xmlToPlainText(xml) {
  return xml
    .replace(/<w:tab[^/]*\/>/g, ' ')
    .replace(/<w:br[^/]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectOutputXml(zip) {
  return Object.keys(zip.files)
    .filter(name => XML_PARTS.test(name))
    .map(name => zip.file(name).asText())
    .join('\n')
}

const REQUIRED_SNIPPETS = [
  'Jane Doe',
  'jane.doe@example.com',
  '123 Main St',
  'PROFESSIONAL SNAPSHOT',
  'Specialty:',
  'Years of Experience:',
  'Travel Experience:',
  'Yes — 1 travel contract',
  'LICENSES',
  'CERTIFICATIONS',
  'CA · RN-123456',
  'TX · RN-789012',
  'BLS',
  'ACLS',
  'EDUCATION',
  'BSN',
  'University of California',
  '06/2016',
  'PROFESSIONAL EXPERIENCE',
  'Mayo Clinic',
  'General Hospital',
  'Rochester, MN',
  'Austin, TX',
  'Epic',
  'Adult ICU',
]

const FORBIDDEN_SNIPPETS = ['undefined', 'null', '[object Object]']

let buffer
try {
  buffer = await buildResumeDocx(completeDocxFixture)
} catch (e) {
  console.error('FAIL: DOCX build threw:', e instanceof Error ? e.message : e)
  process.exit(1)
}

writeFileSync(outPath, buffer)
const zip = new PizZip(buffer)
const xml = collectOutputXml(zip)
const text = xmlToPlainText(xml)

const failures = []

for (const snippet of REQUIRED_SNIPPETS) {
  if (!text.includes(snippet)) {
    failures.push(`missing expected text: ${snippet}`)
  }
}

for (const snippet of FORBIDDEN_SNIPPETS) {
  if (text.toLowerCase().includes(snippet.toLowerCase())) {
    failures.push(`forbidden literal in output: ${snippet}`)
  }
}

const leftoverTags = [...new Set(xml.match(LEFTOVER_TAG_RE) ?? [])]
if (leftoverTags.length) {
  failures.push(`unrendered docxtemplater tags: ${leftoverTags.join(', ')}`)
}

// Snapshot stubs should leave labels but no values after colons in a broken way — tags must not remain.
const snapshotTags = [...xml.matchAll(/\{snapshot_[a-z_]+\}/g)].map(m => m[0])
if (snapshotTags.length) {
  failures.push(`unrendered snapshot tags: ${[...new Set(snapshotTags)].join(', ')}`)
}

if (failures.length) {
  console.error('FAIL: DOCX template smoke\n')
  for (const f of failures) console.error(`  - ${f}`)
  console.error(`\nWrote ${outPath} for inspection`)
  process.exit(1)
}

console.log('OK: DOCX template smoke passed')
console.log(`  Output: ${outPath} (${buffer.length} bytes)`)
console.log('  Next: open in Pages or LibreOffice for layout eyeball (see MANUAL-TEST-CHECKLIST § I)')
