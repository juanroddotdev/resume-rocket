/**
 * One-time template adjustments for VMS client feedback backlog (FR-008, FR-009, FR-003).
 * Run: node scripts/patch-template-vms-backlog.mjs
 */
import PizZip from 'pizzip'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const templatePath = join(process.cwd(), 'server/assets/template.docx')
const zip = new PizZip(readFileSync(templatePath))
let xml = zip.file('word/document.xml').asText()

xml = xml.replace(/Email: <\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*<\/w:rPr><w:t[^>]*>/g, '')
xml = xml.replace(/Phone: <\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*<\/w:rPr><w:t[^>]*>/g, '')
xml = xml.replace(
  '{candidate_city}, {candidate_state}',
  '{candidate_home_address}\n{candidate_city}, {candidate_state}',
)
xml = xml.replace(
  'Patient Ratios: {average_patient_ratios}',
  '',
)
xml = xml.replace(
  'Experience in {facility_types_trauma_levels}. ',
  '',
)
xml = xml.replace(
  '- Managed {experience_average_daily_patients}  patients in {experience_patient_acuity_level} setting',
  'Patient ratio: {experience_average_daily_patients}',
)

zip.file('word/document.xml', xml)
writeFileSync(templatePath, zip.generate({ type: 'nodebuffer' }))
console.log('Patched server/assets/template.docx for VMS backlog')
