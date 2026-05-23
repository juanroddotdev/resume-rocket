import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../server/assets')
mkdirSync(outDir, { recursive: true })

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{first_name} {last_name}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{email} | {phone}</w:t></w:r></w:p>
    <w:p><w:r><w:t>EMR: {emr_system}</w:t></w:r></w:p>
    <w:p><w:r><w:t>License: {license_number}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Facilities:</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#employers}{name} — {beds} beds, Trauma {trauma_level}{/employers}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Certifications:</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#certifications}{.}{/certifications}</w:t></w:r></w:p>
  </w:body>
</w:document>`

function escapeXml(s) {
  return s
}

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
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  emr_system: 'Epic',
  license_number: 'RN-12345',
  employers: [{ name: 'General Hospital', beds: '400', trauma_level: 'II' }],
  certifications: ['BLS', 'ACLS'],
})

const buf = doc.getZip().generate({ type: 'nodebuffer' })
writeFileSync(join(outDir, 'template.docx'), buf)
console.log('Wrote server/assets/template.docx')
