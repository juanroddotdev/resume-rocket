/**
 * Smoke test: legacy JSONB key shapes normalize to identical DOCX output.
 * Usage: node scripts/test-normalize-candidate.mjs
 */
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'
import { normalizeCandidateRow } from '../server/utils/normalizeCandidate.ts'

const legacyRow = {
  first_name: 'Jane',
  last_name: 'Legacy',
  email: 'jane@example.com',
  phone: '555-0100',
  license_number: 'RN-99',
  license_state: 'tx',
  emr_system: 'Epic',
  specialties: ['ICU'],
  credentials: {
    bls: true,
    ACLS: { active: true, expiry: '2026-12-01' },
  },
  employers: [
    {
      name: 'Metro Medical',
      role: 'Staff RN',
      city: 'Austin',
      state: 'TX',
      trauma_level: 'II',
      teaching_status: true,
      start_date: '2019-03',
      end_date: '2023-08',
      beds: 400,
      hospital_id: '00000000-0000-4000-8000-000000000001',
    },
  ],
}

const canonicalRow = {
  first_name: 'Jane',
  last_name: 'Legacy',
  email: 'jane@example.com',
  phone: '555-0100',
  license_number: 'RN-99',
  license_state: 'TX',
  emr_system: 'Epic',
  specialties: ['ICU'],
  credentials: {
    BLS: { active: true },
    ACLS: { active: true, expiry: '2026-12-01' },
  },
  employers: [
    {
      name: 'Metro Medical',
      role: 'Staff RN',
      city: 'Austin',
      state: 'TX',
      traumaLevel: 'II',
      teachingStatus: true,
      startDate: '2019-03',
      endDate: '2023-08',
      beds: 400,
      hospitalId: '00000000-0000-4000-8000-000000000001',
    },
  ],
}

const legacyDocx = mapCandidateToTemplateData(normalizeCandidateRow(legacyRow))
const canonicalDocx = mapCandidateToTemplateData(normalizeCandidateRow(canonicalRow))

function stableStringify(value) {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v)
        .sort()
        .reduce((acc, k) => {
          acc[k] = v[k]
          return acc
        }, {})
    }
    return v
  })
}

const legacyJson = stableStringify(legacyDocx)
const canonicalJson = stableStringify(canonicalDocx)

if (legacyJson !== canonicalJson) {
  console.error('FAIL: legacy and canonical rows produced different DOCX data')
  console.error('Legacy keys sample:', legacyDocx.candidate_state, legacyDocx.professional_experiences?.[0])
  console.error('Canonical keys sample:', canonicalDocx.candidate_state, canonicalDocx.professional_experiences?.[0])
  process.exit(1)
}

console.log('OK: legacy snake_case + mixed credentials → same DOCX mapping as canonical camelCase')
console.log('  experience_trauma_level:', legacyDocx.professional_experiences?.[0]?.experience_trauma_level)
console.log('  ACLS expiry:', legacyDocx.ACLS_certification_expiration_date)
console.log('  active certs:', legacyDocx.core_life_support_certifications)
