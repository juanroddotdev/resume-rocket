import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applySnapshotProposals,
  applySupplementalValueToSnapshot,
  mapGeminiSnapshotProposals,
} from '../utils/professionalSnapshot.ts'
import { buildSupplementalBucket } from '../utils/supplementalBucket.ts'
import { computeMissingTemplateFields } from '../utils/vmsGapReview.ts'

describe('applySnapshotProposals', () => {
  it('never sets included true and stores snippets', () => {
    const merged = applySnapshotProposals(
      {
        snapshot_specialty: { value: 'ICU', included: true },
      },
      {
        snapshot_specialty: { value: 'PICU', sourceSnippet: 'PICU RN' },
        snapshot_magnet_facility_experience: {
          value: 'Yes — Magnet facility',
          sourceSnippet: 'ANCC Magnet',
        },
      },
    )
    assert.equal(merged.snapshot_specialty?.value, 'PICU')
    assert.equal(merged.snapshot_specialty?.included, false)
    assert.equal(merged.snapshot_specialty?.source, 'gemini')
    assert.equal(merged.snapshot_magnet_facility_experience?.value, 'Yes — Magnet facility')
    assert.equal(merged.snapshot_magnet_facility_experience?.included, false)
    assert.equal(merged.snapshot_magnet_facility_experience?.sourceSnippet, 'ANCC Magnet')
  })
})

describe('applySupplementalValueToSnapshot', () => {
  it('writes value with included false', () => {
    const next = applySupplementalValueToSnapshot({}, 'snapshot_emr_systems', 'Epic')
    assert.equal(next.snapshot_emr_systems?.value, 'Epic')
    assert.equal(next.snapshot_emr_systems?.included, false)
    assert.equal(next.snapshot_emr_systems?.source, 'supplemental')
  })
})

describe('mapGeminiSnapshotProposals', () => {
  it('keeps known keys only', () => {
    const mapped = mapGeminiSnapshotProposals({
      snapshot_specialty: { value: 'ICU', source_snippet: 'ICU nurse' },
      junk: { value: 'x' },
    })
    assert.equal(mapped.snapshot_specialty?.value, 'ICU')
    assert.equal(mapped.snapshot_specialty?.sourceSnippet, 'ICU nurse')
    assert.equal('junk' in mapped, false)
  })
})

describe('buildSupplementalBucket', () => {
  it('lists template-removed fields with apply targets', () => {
    const items = buildSupplementalBucket({
      specialties: ['ICU'],
      years_nursing_experience: '8',
      compact_license_status: 'Yes',
      specialized_medical_equipment: 'ECMO',
      employers: [
        {
          name: 'Mayo',
          employmentType: 'Travel',
          role: 'ICU RN',
          highlights: ['Charge nurse'],
          floatedUnits: ['ER'],
        },
      ],
    })
    const byId = Object.fromEntries(items.map(i => [i.id, i]))
    assert.equal(byId.years_nursing_experience?.applyTargetKey, 'snapshot_years_experience')
    assert.equal(byId.compact_license_status?.value, 'Yes')
    assert.equal(byId['employer-0-type']?.applyTargetKey, 'snapshot_travel_experience')
    assert.ok(byId['employer-0-highlights']?.value.includes('Charge'))
  })
})

describe('computeMissingTemplateFields (July template)', () => {
  it('does not require template-removed employment or clinical summary fields', () => {
    const missing = computeMissingTemplateFields({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'j@example.com',
      phone: '555',
      specialties: ['ICU'],
      licenses: [{ state: 'CA', number: 'RN-1' }],
      education: [{ degree: 'BSN', school: 'State', graduationMonth: '06', graduationYear: '2016' }],
      employers: [
        {
          name: 'Mayo',
          startDate: '2020-01',
          endDate: '2024-01',
          patientScope: 'Adult ICU',
          emrSystem: 'Epic',
        },
      ],
    })
    const ids = missing.map(m => m.id)
    assert.equal(ids.includes('years_nursing_experience'), false)
    assert.equal(ids.includes('compact_license_status'), false)
    assert.equal(ids.includes('specialized_medical_equipment'), false)
    assert.equal(ids.includes('employer-0-role'), false)
    assert.equal(ids.includes('employer-0-type'), false)
    assert.equal(ids.includes('employer-0-highlights'), false)
    assert.equal(ids.includes('employer-0-beds'), false)
    assert.deepEqual(ids, [])
  })
})
