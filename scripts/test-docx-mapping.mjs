/**
 * Smoke test for Phase A docxBuilder mapping.
 * Usage: node scripts/test-docx-mapping.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildResumeDocx, mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

const fixture = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane.doe@example.com',
  phone: '(555) 123-4567',
  license_number: 'RN-123456',
  license_state: 'CA',
  emr_system: 'Epic',
  specialties: ['ICU', 'Med-Surg'],
  credentials: { BLS: true, ACLS: true, PALS: false, CCRN: true },
  employers: [
    {
      name: 'Mayo Clinic',
      role: 'Staff RN — ICU',
      city: 'Rochester',
      state: 'MN',
      beds: 500,
      traumaLevel: 'I',
      teachingStatus: true,
      startDate: '2020-01',
      endDate: '2024-06',
    },
    {
      name: 'General Hospital',
      city: 'Austin',
      state: 'TX',
      beds: 320,
      traumaLevel: 'II',
      teachingStatus: false,
    },
  ],
}

const data = mapCandidateToTemplateData(fixture)
const outPath = join('/tmp', 'resume-rocket-test.docx')

function flatten(obj, prefix = '') {
  const lines = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      if (typeof value[0] === 'object' && value[0] !== null) {
        value.forEach((item, i) => lines.push(...flatten(item, `${path}[${i}]`)))
      } else {
        lines.push(`${path}: ${JSON.stringify(value)}`)
      }
    } else if (value !== '' && value != null) {
      lines.push(`${path}: ${value}`)
    }
  }
  return lines
}

console.log('Mapped fields (non-empty):\n')
for (const line of flatten(data).sort()) {
  console.log(`  ${line}`)
}

try {
  const buffer = await buildResumeDocx(fixture)
  writeFileSync(outPath, buffer)
  console.log(`\nWrote ${outPath} (${buffer.length} bytes)`)
} catch (e) {
  console.error('\nDOCX build failed:', e instanceof Error ? e.message : e)
  console.error('Ensure server/assets/template.docx exists (see README).')
  process.exit(1)
}
