/**
 * Fix spaced loop item tags `{ . }` → `{.}` so docxtemplater renders list values.
 * Run: node scripts/patch-template-loop-dot-tags.mjs
 */
import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const templatePath = join(process.cwd(), 'server/assets/template.docx')
const zip = new PizZip(readFileSync(templatePath))
let xml = zip.file('word/document.xml').asText()

const spacedDotTag = /\{\s+\.\s+\}/g
const before = (xml.match(spacedDotTag) || []).length
xml = xml.replace(spacedDotTag, '{.}')
const after = (xml.match(spacedDotTag) || []).length

if (before === 0) {
  console.log('No spaced loop dot tags found — template already patched.')
  process.exit(0)
}

zip.file('word/document.xml', xml)
writeFileSync(templatePath, zip.generate({ type: 'nodebuffer' }))
console.log(`Patched ${before} spaced loop dot tag(s) in server/assets/template.docx (${after} remaining)`)
