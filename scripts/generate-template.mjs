import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../server/assets')
mkdirSync(outDir, { recursive: true })

/** @deprecated Minimal placeholder generator — production uses tracked server/assets/template.docx. */
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{candidate_first_name} {candidate_last_name}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{candidate_email} | {candidate_phone}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{candidate_city}, {candidate_state}</w:t></w:r></w:p>
    <w:p><w:r><w:t>License: {rn_license_state_and_expiry}</w:t></w:r></w:p>
    <w:p><w:r><w:t>EMR: {emr_software_proficiencies}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Specialty: {primary_specialty_unit}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Certifications: {core_life_support_certifications}</w:t></w:r></w:p>
    <w:p><w:r><w:t>BLS {BLS_certification_expiration_date} | ACLS {ACLS_certification_expiration_date}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#professional_experiences}{experience_hospital_name} — {experience_facility_location} ({experience_hospital_total_beds} beds, trauma {experience_trauma_level}, teaching {experience_is_teaching_facility}){/professional_experiences}</w:t></w:r></w:p>
  </w:body>
</w:document>`

const zip = new PizZip()
zip.file(
  '[Content_Types].xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
)
zip.folder('_rels')?.file(
  '.rels',
  `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
)
zip.folder('word')?.file('document.xml', documentXml)

const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
doc.render({
  candidate_first_name: 'Jane',
  candidate_last_name: 'Doe',
  candidate_email: 'jane@example.com',
  candidate_phone: '555-0100',
  candidate_city: 'Rochester',
  candidate_state: 'MN',
  rn_license_state_and_expiry: 'MN — RN-12345',
  emr_software_proficiencies: 'Epic',
  primary_specialty_unit: 'ICU',
  core_life_support_certifications: 'BLS, ACLS',
  BLS_certification_expiration_date: 'Current',
  ACLS_certification_expiration_date: 'Current',
  professional_experiences: [
    {
      experience_hospital_name: 'General Hospital',
      experience_facility_location: 'Austin, TX',
      experience_hospital_total_beds: '400',
      experience_trauma_level: 'II',
      experience_is_teaching_facility: 'No',
    },
  ],
})

const buf = doc.getZip().generate({ type: 'nodebuffer' })
writeFileSync(join(outDir, 'template.docx'), buf)
console.log('Wrote server/assets/template.docx (VMS tag names — replace with contract template for production)')
