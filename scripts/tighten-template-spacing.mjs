/**
 * Tightens paragraph spacing in the DOCX template:
 * - All paragraphs: single line spacing (240), small after (60 twips / 3pt)
 * - First line of each professional experience entry: w:before="300" (15pt gap)
 * Run: node scripts/tighten-template-spacing.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import PizZip from 'pizzip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = resolve(__dirname, '../server/assets/template.docx')

const zip = new PizZip(readFileSync(TEMPLATE))
let doc = zip.file('word/document.xml').asText()

// 1. Globally tighten: single line spacing + reduced after-paragraph spacing
doc = doc.replace(
  /<w:spacing w:after="200" w:before="0" w:line="276" w:lineRule="auto"\/>/g,
  '<w:spacing w:after="60" w:before="0" w:line="240" w:lineRule="auto"/>'
)
doc = doc.replace(
  /<w:spacing w:after="200" w:before="0" w:line="240" w:lineRule="auto"\/>/g,
  '<w:spacing w:after="60" w:before="0" w:line="240" w:lineRule="auto"/>'
)

// 2. Add before-spacing on the experience entry's first content paragraph
//    The first content paragraph after {#professional_experiences} is "RN - {experience_unit_specialty}"
//    We target that specific paragraph's spacing to add w:before="300"
doc = doc.replace(
  /(\{#professional_experiences\}<\/w:t><\/w:r><\/w:p>)/,
  (match) => {
    return match
  }
)

// Find the paragraph containing "RN - {experience_unit_specialty}" and add before spacing
// This paragraph's spacing should be: after=60, before=300 (gap above each entry)
const specialtyTag = 'RN - {experience_unit_specialty}'
const specialtyIdx = doc.indexOf(specialtyTag)
if (specialtyIdx > -1) {
  // Find the <w:spacing> in the same <w:p> that contains this text
  // Walk backward to find the paragraph start
  const pStart = doc.lastIndexOf('<w:p ', specialtyIdx)
  const spacingInPara = doc.indexOf('<w:spacing', pStart)
  const spacingEnd = doc.indexOf('/>', spacingInPara) + 2

  const oldSpacing = doc.slice(spacingInPara, spacingEnd)
  const newSpacing = '<w:spacing w:after="60" w:before="300" w:line="240" w:lineRule="auto"/>'
  doc = doc.slice(0, spacingInPara) + newSpacing + doc.slice(spacingEnd)

  console.log(`  Specialty line: ${oldSpacing} → ${newSpacing}`)
}

zip.file('word/document.xml', doc)

// Also tighten header/footer
for (const part of ['word/header1.xml', 'word/footer1.xml']) {
  const file = zip.file(part)
  if (!file) continue
  let xml = file.asText()
  xml = xml.replace(
    /<w:spacing w:after="200" w:before="0" w:line="276" w:lineRule="auto"\/>/g,
    '<w:spacing w:after="60" w:before="0" w:line="240" w:lineRule="auto"/>'
  )
  xml = xml.replace(
    /<w:spacing w:after="200" w:before="0" w:line="240" w:lineRule="auto"\/>/g,
    '<w:spacing w:after="60" w:before="0" w:line="240" w:lineRule="auto"/>'
  )
  zip.file(part, xml)
}

const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
writeFileSync(TEMPLATE, output)
console.log('✓ template.docx spacing tightened')
