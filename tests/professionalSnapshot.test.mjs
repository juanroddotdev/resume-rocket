/**
 * Unit tests for Professional Snapshot derivation (Phase 2).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildProfessionalSnapshotFromCandidate,
  computeSnapshotMismatches,
  normalizeProfessionalSnapshot,
  professionalSnapshotToTemplateData,
  resolveProfessionalSnapshotForDocx,
} from '../utils/professionalSnapshot.ts'
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

describe('buildProfessionalSnapshotFromCandidate', () => {
  it('derives specialty, years, EMR, trauma, travel, clinical flags', () => {
    const snapshot = buildProfessionalSnapshotFromCandidate({
      specialties: ['ICU', 'Med-Surg'],
      years_nursing_experience: '8',
      average_patient_ratios: '1:4 ICU',
      specialized_medical_equipment: 'ECMO',
      emr_system: 'Epic',
      employers: [
        {
          name: 'Mayo',
          employmentType: 'Travel',
          traumaLevel: 'I',
          teachingStatus: true,
          chargeNurseExperience: true,
          preceptorExperience: false,
          floatedUnits: ['ER', 'Step-down'],
          equipmentProcedures: ['CRRT'],
          emrSystem: 'Epic',
          avgDailyPatients: '2-3',
        },
        {
          name: 'General',
          employmentType: 'Travel',
          traumaLevel: 'II',
          teachingStatus: false,
          preceptorExperience: true,
          floatedUnits: ['ICU'],
          equipmentProcedures: ['Ventilator management'],
          emrSystem: 'Cerner',
        },
      ],
    })

    assert.equal(snapshot.snapshot_specialty?.value, 'ICU')
    assert.equal(snapshot.snapshot_specialty?.included, true)
    assert.equal(snapshot.snapshot_years_experience?.value, '8')
    assert.equal(snapshot.snapshot_travel_experience?.value, 'Yes — 2 travel contracts')
    assert.equal(snapshot.snapshot_trauma_experience?.value, 'Level I & II')
    assert.equal(snapshot.snapshot_teaching_facility_experience?.value, 'Yes')
    assert.equal(snapshot.snapshot_magnet_facility_experience?.value, '')
    assert.equal(snapshot.snapshot_magnet_facility_experience?.included, false)
    assert.equal(snapshot.snapshot_charge_nurse_experience?.value, 'Yes')
    assert.equal(snapshot.snapshot_preceptor_experience?.value, 'Yes')
    assert.match(snapshot.snapshot_float_experience?.value || '', /ER/)
    assert.match(snapshot.snapshot_emr_systems?.value || '', /Epic/)
    assert.match(snapshot.snapshot_equipment_skills?.value || '', /ECMO/)
    assert.match(snapshot.snapshot_patient_ratios_managed?.value || '', /1:4 ICU/)
  })

  it('leaves magnet empty and omits excluded lines from template map', () => {
    const snapshot = buildProfessionalSnapshotFromCandidate({
      specialties: ['OR'],
      employers: [],
    })
    const mapped = professionalSnapshotToTemplateData(snapshot)
    assert.equal(mapped.snapshot_specialty, 'OR')
    assert.equal(mapped.snapshot_magnet_facility_experience, '')
    assert.equal(mapped.snapshot_travel_experience, '')
  })
})

describe('resolveProfessionalSnapshotForDocx', () => {
  it('prefers stored snapshot when it has values', () => {
    const resolved = resolveProfessionalSnapshotForDocx({
      specialties: ['ICU'],
      years_nursing_experience: '8',
      professional_snapshot: {
        snapshot_specialty: { value: 'PICU', included: true, source: 'admin' },
        snapshot_years_experience: { value: '10', included: false },
      },
    })
    assert.equal(resolved.snapshot_specialty?.value, 'PICU')
    assert.equal(
      professionalSnapshotToTemplateData(resolved).snapshot_years_experience,
      '',
    )
  })

  it('derives when stored snapshot is empty', () => {
    const resolved = resolveProfessionalSnapshotForDocx({
      specialties: ['ICU'],
      years_nursing_experience: '5',
      professional_snapshot: {},
    })
    assert.equal(resolved.snapshot_specialty?.value, 'ICU')
    assert.equal(resolved.snapshot_years_experience?.value, '5')
  })
})

describe('normalizeProfessionalSnapshot', () => {
  it('drops unknown keys and trims values', () => {
    const normalized = normalizeProfessionalSnapshot({
      snapshot_specialty: { value: '  ICU  ', included: true },
      junk: { value: 'x', included: true },
    })
    assert.equal(normalized.snapshot_specialty?.value, 'ICU')
    assert.equal('junk' in normalized, false)
  })
})

describe('computeSnapshotMismatches', () => {
  it('flags charge Yes when no employer has the flag', () => {
    const warnings = computeSnapshotMismatches(
      {
        snapshot_charge_nurse_experience: { value: 'Yes', included: true },
      },
      {
        employers: [{ name: 'Metro', chargeNurseExperience: false }],
      },
    )
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0]?.key, 'snapshot_charge_nurse_experience')
  })

  it('is quiet when charge Yes matches an employer flag', () => {
    const warnings = computeSnapshotMismatches(
      {
        snapshot_charge_nurse_experience: { value: 'Yes', included: true },
      },
      {
        employers: [{ name: 'Metro', chargeNurseExperience: true }],
      },
    )
    assert.equal(warnings.length, 0)
  })
})

describe('mapCandidateToTemplateData snapshot wiring', () => {
  it('fills snapshot tags from derived employer data', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      specialties: ['ICU'],
      years_nursing_experience: '8',
      specialized_medical_equipment: 'ECMO',
      employers: [
        {
          name: 'Mayo',
          employmentType: 'Travel',
          traumaLevel: 'I',
          teachingStatus: true,
          chargeNurseExperience: true,
          floatedUnits: ['ER'],
          emrSystem: 'Epic',
        },
      ],
    })
    assert.equal(data.snapshot_specialty, 'ICU')
    assert.equal(data.snapshot_years_experience, '8')
    assert.equal(data.snapshot_travel_experience, 'Yes — 1 travel contract')
    assert.equal(data.snapshot_trauma_experience, 'Level I')
    assert.equal(data.snapshot_teaching_facility_experience, 'Yes')
    assert.equal(data.snapshot_charge_nurse_experience, 'Yes')
    assert.equal(data.snapshot_magnet_facility_experience, '')
    assert.match(String(data.snapshot_emr_systems), /Epic/)
  })

  it('omits unchecked snapshot lines from rendered DOCX text', async () => {
    const { buildResumeDocx } = await import('../server/utils/docxBuilder.ts')
    const PizZip = (await import('pizzip')).default
    const buffer = await buildResumeDocx({
      first_name: 'Jane',
      last_name: 'Doe',
      specialties: ['ICU'],
      years_nursing_experience: '8',
      professional_snapshot: {
        snapshot_specialty: { value: 'ICU', included: true },
        snapshot_years_experience: { value: '8', included: false },
        snapshot_travel_experience: { value: 'Yes', included: false },
      },
    })
    const zip = new PizZip(buffer)
    const xml = zip.file('word/document.xml').asText()
    const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    assert.match(text, /Specialty:\s*ICU/)
    assert.equal(text.includes('Years of Experience:'), false)
    assert.equal(text.includes('Travel Experience:'), false)
  })
})
