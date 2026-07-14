/**
 * Smoke test for docxBuilder mapping — full VMS manifest coverage.
 * Usage: node scripts/test-docx-mapping.mjs
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildResumeDocx, mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'
import { completeDocxFixture } from './fixtures/complete-docx-candidate.mjs'

const data = mapCandidateToTemplateData(completeDocxFixture)
const outPath = join('/tmp', 'resume-rocket-test.docx')

/** Tags that may legitimately be empty even for a complete submission. */
const OPTIONAL_EMPTY = new Set([
  'PALS_certification_expiration_date', // optional cert in manifest
  'average_patient_ratios', // omitted from DOCX summary per client feedback
  'facility_types_trauma_levels', // trauma shown per employer only
  'experience_facility_type', // trauma not duplicated on title line
  'experience_role_details', // omitted when redundant with unit specialty
  // New template snapshot lines — populated in Phase 2 (professional_snapshot JSONB)
  'snapshot_specialty',
  'snapshot_years_experience',
  'snapshot_travel_experience',
  'snapshot_trauma_experience',
  'snapshot_teaching_facility_experience',
  'snapshot_magnet_facility_experience',
  'snapshot_charge_nurse_experience',
  'snapshot_preceptor_experience',
  'snapshot_float_experience',
  'snapshot_emr_systems',
  'snapshot_patient_ratios_managed',
  'snapshot_equipment_skills',
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
  ['experience_patient_acuity_level', exp0?.experience_patient_acuity_level, 'High acuity'],
  ['experience_highlights', exp0?.experience_highlights?.length, 2],
]

for (const [label, actual, expected] of checks) {
  if (actual !== expected) {
    console.error(`FAIL: ${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    process.exit(1)
  }
}

try {
  const buffer = await buildResumeDocx(completeDocxFixture)
  writeFileSync(outPath, buffer)
  console.log(`\nOK: all required manifest fields populated`)
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`)
} catch (e) {
  console.error('\nDOCX build failed:', e instanceof Error ? e.message : e)
  console.error('Ensure server/assets/template.docx exists (see README).')
  process.exit(1)
}
