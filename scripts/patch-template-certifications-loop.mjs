/**
 * Add certifications_list loop to contract template for name + expiry per cert.
 * Run: node scripts/patch-template-certifications-loop.mjs
 */
import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const templatePath = join(process.cwd(), 'server/assets/template.docx')
const zip = new PizZip(readFileSync(templatePath))
let xml = zip.file('word/document.xml').asText()

xml = xml.replace(
  'Certifications: {core_life_support_certifications}',
  '{#certifications_list}{certification_name}: {certification_expiration_date}{/certifications_list}',
)
xml = xml.replace(/BLS: \{BLS_certification_expiration_date\}/g, '')
xml = xml.replace(/ACLS: \{ACLS_certification_expiration_date\}/g, '')
xml = xml.replace(/PALS: \{PALS_certification_expiration_date\}/g, '')

zip.file('word/document.xml', xml)
writeFileSync(templatePath, zip.generate({ type: 'nodebuffer' }))
console.log('Patched server/assets/template.docx with certifications_list loop')
