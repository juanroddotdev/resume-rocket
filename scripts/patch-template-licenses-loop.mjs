/**
 * Wrap rn_license_state_and_expiry in a licenses_list loop for multi-license DOCX output.
 * Run: node scripts/patch-template-licenses-loop.mjs
 */
import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const templatePath = join(process.cwd(), 'server/assets/template.docx')
const zip = new PizZip(readFileSync(templatePath))
let xml = zip.file('word/document.xml').asText()

const before = xml.includes('{rn_license_state_and_expiry}')
if (!before) {
  console.error('Template has no {rn_license_state_and_expiry} scalar to patch.')
  process.exit(1)
}

xml = xml.replace(
  '{rn_license_state_and_expiry}',
  '{#licenses_list}{rn_license_state_and_expiry}{/licenses_list}',
)

zip.file('word/document.xml', xml)
writeFileSync(templatePath, zip.generate({ type: 'nodebuffer' }))
console.log('Patched server/assets/template.docx with licenses_list loop')
