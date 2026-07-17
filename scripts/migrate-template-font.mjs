/**
 * Replaces embedded Helvetica Neue with Inter in the DOCX template.
 * Run: node scripts/migrate-template-font.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import PizZip from 'pizzip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = resolve(__dirname, '../server/assets/template.docx')
const FONTS_DIR = resolve(__dirname, 'fonts/Inter/static')

const FONT_NAME = 'Inter'

const fontFiles = {
  regular: resolve(FONTS_DIR, 'Inter_18pt-Regular.ttf'),
  bold: resolve(FONTS_DIR, 'Inter_18pt-Bold.ttf'),
  italic: resolve(FONTS_DIR, 'Inter_18pt-Italic.ttf'),
  boldItalic: resolve(FONTS_DIR, 'Inter_18pt-BoldItalic.ttf'),
}

const zip = new PizZip(readFileSync(TEMPLATE))

// 1. Replace font binary files
zip.remove('word/fonts/HelveticaNeue-regular.ttf')
zip.remove('word/fonts/HelveticaNeue-bold.ttf')
zip.remove('word/fonts/HelveticaNeue-italic.ttf')
zip.remove('word/fonts/HelveticaNeue-boldItalic.ttf')

zip.file('word/fonts/Inter-regular.ttf', readFileSync(fontFiles.regular))
zip.file('word/fonts/Inter-bold.ttf', readFileSync(fontFiles.bold))
zip.file('word/fonts/Inter-italic.ttf', readFileSync(fontFiles.italic))
zip.file('word/fonts/Inter-boldItalic.ttf', readFileSync(fontFiles.boldItalic))

// 2. Update fontTable.xml.rels — point to new filenames
const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/Inter-regular.ttf"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/Inter-bold.ttf"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/Inter-italic.ttf"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/Inter-boldItalic.ttf"/></Relationships>`
zip.file('word/_rels/fontTable.xml.rels', rels)

// 3. Update fontTable.xml — declare Inter with embeddings
const fontTable = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="${FONT_NAME}"><w:embedRegular w:fontKey="{00000000-0000-0000-0000-000000000000}" r:id="rId1" w:subsetted="0"/><w:embedBold w:fontKey="{00000000-0000-0000-0000-000000000000}" r:id="rId2" w:subsetted="0"/><w:embedItalic w:fontKey="{00000000-0000-0000-0000-000000000000}" r:id="rId3" w:subsetted="0"/><w:embedBoldItalic w:fontKey="{00000000-0000-0000-0000-000000000000}" r:id="rId4" w:subsetted="0"/></w:font></w:fonts>`
zip.file('word/fontTable.xml', fontTable)

// 4. Replace font references in all XML parts
const xmlParts = [
  'word/document.xml',
  'word/header1.xml',
  'word/footer1.xml',
  'word/styles.xml',
  'word/numbering.xml',
  'word/theme/theme1.xml',
]

for (const part of xmlParts) {
  const file = zip.file(part)
  if (!file) continue
  let xml = file.asText()

  // Replace all font name references
  xml = xml.replace(/Helvetica Neue/g, FONT_NAME)
  xml = xml.replace(/Georgia/g, FONT_NAME)
  xml = xml.replace(/Cambria/g, FONT_NAME)
  xml = xml.replace(/Arial/g, FONT_NAME)

  // In theme1.xml, also update the major/minor font typeface attributes
  if (part.includes('theme1.xml')) {
    xml = xml.replace(/typeface="Calibri"/g, `typeface="${FONT_NAME}"`)
  }

  zip.file(part, xml)
}

// 5. Write the updated template
const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
writeFileSync(TEMPLATE, output)

console.log(`✓ template.docx updated — all fonts now "${FONT_NAME}" (embedded)`)
