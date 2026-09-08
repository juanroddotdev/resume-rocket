/**
 * Recruiter-visible packet rules: must print / must not print.
 * Slice 1 — Compact, EMR isolation, highlights, snapshot No, metrics, RN prefix.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countPhrase, packetFor } from './helpers/packetText.mjs'

function jane(overrides = {}) {
  return {
    first_name: 'Jane',
    last_name: 'Doe',
    ...overrides,
  }
}

const RULES = [
  {
    name: 'prints Compact on every license row marked Yes',
    candidate: jane({
      licenses: [
        { state: 'TX', number: 'RN-1', compact: 'Yes' },
        { state: 'CA', number: 'RN-2', compact: 'Yes' },
      ],
    }),
    must: ['TX · RN-1 · Compact', 'CA · RN-2 · Compact'],
  },
  {
    name: 'does not print Compact on a license answered No',
    candidate: jane({
      compact_license_status: 'Yes',
      licenses: [
        { state: 'TX', number: 'RN-1', compact: 'Yes' },
        { state: 'CA', number: 'RN-2', compact: 'No' },
      ],
    }),
    must: ['TX · RN-1 · Compact'],
    mustNot: ['CA · RN-2 · Compact'],
  },
  {
    name: 'legacy global Yes stamps Compact on the first complete license',
    candidate: jane({
      compact_license_status: 'Yes',
      licenses: [
        { state: 'TX', number: 'RN-1', expiry: '06/2027' },
        { state: 'CA', number: 'RN-2' },
      ],
    }),
    must: ['TX · RN-1 · 06/2027 · Compact'],
    mustNot: ['CA · RN-2 · Compact'],
  },
  {
    name: 'legacy Compact skips an incomplete earlier license row',
    candidate: jane({
      compact_license_status: 'Yes',
      licenses: [
        { state: 'TX' },
        { state: 'CA', number: 'RN-2' },
      ],
    }),
    must: ['CA · RN-2 · Compact'],
    mustNot: ['TX · Compact'],
  },
  {
    name: 'does not copy one job EMR onto another job with no EMR',
    candidate: jane({
      emr_system: 'Epic',
      specialties: ['ICU'],
      employers: [
        { name: 'Metro Hospital', role: 'ICU RN', emrSystem: 'Epic' },
        { name: 'Regional Medical', role: 'ER RN' },
      ],
    }),
    must: ['EMR Epic'],
    check(data) {
      assert.equal(data.professional_experiences[0].experience_emr_system, 'EMR Epic')
      assert.equal(data.professional_experiences[1].experience_emr_system, '')
      assert.equal(data.professional_experiences[1].experience_metrics_line.includes('EMR'), false)
    },
  },
  {
    name: 'prints user highlights as bullets and charge on the metrics line only',
    candidate: jane({
      employers: [{
        name: 'Metro Hospital',
        role: 'ICU RN',
        highlights: ['Led rapid response team', 'Charge nurse experience'],
        chargeNurseExperience: true,
      }],
    }),
    must: ['Led rapid response team', 'Charge nurse experience'],
    mustCount: { 'Charge nurse experience': 1 },
  },
  {
    name: 'omits Teaching No and Magnet No from job metrics',
    candidate: jane({
      employers: [{
        name: 'Metro Hospital',
        role: 'ICU RN',
        teachingStatus: false,
        magnetStatus: false,
        chargeNurseExperience: true,
      }],
    }),
    must: ['Charge nurse experience'],
    mustNot: ['Teaching No', 'Magnet No'],
  },
  {
    name: 'omits snapshot flags answered No even when included',
    candidate: jane({
      specialties: ['ICU'],
      professional_snapshot: {
        snapshot_specialty: { value: 'ICU', included: true },
        snapshot_teaching_facility_experience: { value: 'No', included: true },
        snapshot_charge_nurse_experience: { value: 'No', included: true },
        snapshot_magnet_facility_experience: { value: 'No', included: true },
      },
    }),
    must: ['Specialty: ICU'],
    mustNot: [
      'Teaching Facility Experience: No',
      'Charge Nurse Experience: No',
      'Magnet Facility Experience: No',
    ],
  },
  {
    name: 'does not prefix job headings with RN by default',
    candidate: jane({
      specialties: ['ICU'],
      employers: [{
        name: 'Metro Hospital',
        role: 'ICU',
        employmentType: 'Staff',
      }],
    }),
    must: ['Staff — ICU'],
    mustNot: ['Staff RN —'],
    check(data) {
      assert.equal(data.professional_experiences[0].experience_unit_specialty, 'Staff — ICU')
    },
  },
  {
    name: 'omits redundant role details when the role matches the heading',
    candidate: jane({
      specialties: ['PICU'],
      employers: [{ name: 'Metro Hospital', role: 'PICU RN', emrSystem: 'Epic' }],
    }),
    check(data) {
      assert.equal(data.professional_experiences[0].experience_unit_specialty, 'PICU RN')
      assert.equal(data.professional_experiences[0].experience_role_details, '')
    },
  },
  {
    name: 'omits empty metric slots so the line has no orphan separators',
    candidate: jane({
      employers: [{
        name: 'Metro Hospital',
        unitBedCount: '24',
        traumaLevel: 'I',
        emrSystem: 'Epic',
      }],
    }),
    must: ['24 unit beds • Trauma I • EMR Epic'],
    mustNot: [' •  • '],
  },
  {
    name: 'uses home state for candidate_state, not license state',
    candidate: jane({
      home_state: 'TX',
      license_state: 'CA',
      license_number: 'RN-1',
    }),
    check(data) {
      assert.equal(data.candidate_state, 'TX')
    },
  },
  {
    name: 'never leaves the literal word undefined in packet text',
    candidate: jane({
      specialties: ['ICU'],
      employers: [{ role: 'ICU RN' }],
      education: [{}],
    }),
    mustNot: ['undefined'],
  },
]

describe('packet rules', () => {
  for (const rule of RULES) {
    it(rule.name, async () => {
      const { data, text } = await packetFor(rule.candidate)
      for (const phrase of rule.must || []) {
        assert.ok(text.includes(phrase), `expected packet to include “${phrase}”\nGot: ${text}`)
      }
      for (const phrase of rule.mustNot || []) {
        assert.equal(
          text.includes(phrase),
          false,
          `expected packet not to include “${phrase}”\nGot: ${text}`,
        )
      }
      for (const [phrase, expected] of Object.entries(rule.mustCount || {})) {
        assert.equal(
          countPhrase(text, phrase),
          expected,
          `expected “${phrase}” ${expected} time(s) in packet`,
        )
      }
      rule.check?.(data, text)
    })
  }
})
