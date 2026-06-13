/**
 * Smoke test for docxBuilder mapping — full VMS manifest coverage.
 * Usage: node scripts/test-docx-mapping.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildResumeDocx, mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

/** Fully completed wizard submission — every required manifest field populated. */
const fixture = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane.doe@example.com',
  phone: '(555) 123-4567',
  license_number: 'RN-123456',
  license_state: 'CA',
  emr_system: 'Epic',
  years_nursing_experience: '8',
  compact_license_status: 'Yes',
  average_patient_ratios: '1:4 ICU, 1:6 Med-Surg',
  specialized_medical_equipment: 'ECMO, CRRT, ventilators',
  specialties: ['ICU', 'Med-Surg'],
  credentials: {
    BLS: { active: true, expiry: '2026-06-01' },
    ACLS: { active: true, expiry: '2026-08-15' },
    PALS: { active: true, expiry: '2027-01-20' },
    CCRN: { active: true },
  },
  education: [
    { degree: 'BSN', school: 'University of California', graduationMonth: '06', graduationYear: '2016' },
  ],
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
      employmentType: 'Staff',
      unitBedCount: '24',
      patientScope: 'Adult ICU — critical care',
      avgDailyPatients: '2-3',
      patientAcuity: 'High acuity',
      floatedUnits: ['ER', 'Step-down'],
      equipmentProcedures: ['ECMO', 'CRRT', 'Ventilator management'],
      highlights: ['Charge nurse 18 months', 'Preceptor for new grads'],
    },
    {
      name: 'General Hospital',
      role: 'Travel RN — Med-Surg',
      city: 'Austin',
      state: 'TX',
      beds: 320,
      traumaLevel: 'II',
      teachingStatus: false,
      startDate: '2018-03',
      endDate: '2019-12',
      employmentType: 'Travel',
      unitBedCount: '32',
      patientScope: 'Med-Surg telemetry',
      avgDailyPatients: '5-6',
      patientAcuity: 'Moderate',
      floatedUnits: ['ICU'],
      equipmentProcedures: ['IV therapy', 'Wound care'],
      highlights: ['Consistent patient satisfaction scores'],
    },
  ],
}

const data = mapCandidateToTemplateData(fixture)
const outPath = join('/tmp', 'resume-rocket-test.docx')

/** Tags that may legitimately be empty even for a complete submission. */
const OPTIONAL_EMPTY = new Set([
  'PALS_certification_expiration_date', // optional cert in manifest
])

function flatten(obj, prefix = '') {
  const lines = []
  const empty = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) {
      if (value.length === 0) {
        empty.push(path)
        continue
      }
      if (typeof value[0] === 'object' && value[0] !== null) {
        value.forEach((item, i) => {
          const nested = flatten(item, `${path}[${i}]`)
          lines.push(...nested.lines)
          empty.push(...nested.empty)
        })
      } else {
        lines.push(`${path}: ${JSON.stringify(value)}`)
      }
    } else if (value !== '' && value != null) {
      lines.push(`${path}: ${value}`)
    } else {
      empty.push(path)
    }
  }
  return { lines, empty }
}

const { lines, empty } = flatten(data)

console.log('Mapped fields (non-empty):\n')
for (const line of lines.sort()) {
  console.log(`  ${line}`)
}

const unexpectedEmpty = empty.filter(path => {
  const leaf = path.split('.').pop()?.replace(/\[\d+\]$/, '') || path
  return !OPTIONAL_EMPTY.has(leaf)
})

if (unexpectedEmpty.length) {
  console.error('\nFAIL: empty mapped fields for fully completed fixture:')
  for (const path of unexpectedEmpty.sort()) console.error(`  ${path}`)
  process.exit(1)
}

const exp0 = data.professional_experiences[0]
const checks = [
  ['total_years_nursing_experience', data.total_years_nursing_experience, '8'],
  ['compact_license_status', data.compact_license_status, 'Yes'],
  ['education[0].education_degree', data.education[0]?.education_degree, 'BSN'],
  ['education[0].education_graduation_year', data.education[0]?.education_graduation_year, '06/2016'],
  ['BLS expiry', data.BLS_certification_expiration_date, '06/2026'],
  ['experience_employment_type', exp0?.experience_employment_type, 'Staff'],
  ['experience_patient_scope', exp0?.experience_patient_scope, 'Adult ICU — critical care'],
  ['experience_highlights', exp0?.experience_highlights?.length, 2],
]

for (const [label, actual, expected] of checks) {
  if (actual !== expected) {
    console.error(`FAIL: ${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    process.exit(1)
  }
}

try {
  const buffer = await buildResumeDocx(fixture)
  writeFileSync(outPath, buffer)
  console.log(`\nOK: all required manifest fields populated`)
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`)
} catch (e) {
  console.error('\nDOCX build failed:', e instanceof Error ? e.message : e)
  console.error('Ensure server/assets/template.docx exists (see README).')
  process.exit(1)
}
