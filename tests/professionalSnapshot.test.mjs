/**
 * Unit tests for Professional Snapshot derivation (Phase 2).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildProfessionalSnapshotFromCandidate,
  computeSnapshotMismatches,
  formatExperienceFlagValue,
  isSnapshotExperienceFlag,
  normalizeProfessionalSnapshot,
  parseExperienceFlagValue,
  professionalSnapshotToLines,
  professionalSnapshotToTemplateData,
  resolveProfessionalSnapshotForDocx,
} from '../utils/professionalSnapshot.ts'
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

describe('parseExperienceFlagValue / formatExperienceFlagValue', () => {
  it('round-trips Yes with detail', () => {
    assert.deepEqual(parseExperienceFlagValue('Yes — Level I'), {
      answer: 'yes',
      detail: 'Level I',
    })
    assert.equal(formatExperienceFlagValue('yes', 'Level I'), 'Yes — Level I')
  })

  it('parses bare Yes/No and legacy free text as Yes+detail', () => {
    assert.deepEqual(parseExperienceFlagValue('Yes'), { answer: 'yes', detail: '' })
    assert.deepEqual(parseExperienceFlagValue('No'), { answer: 'no', detail: '' })
    assert.deepEqual(parseExperienceFlagValue('Level I & II'), {
      answer: 'yes',
      detail: 'Level I & II',
    })
    assert.deepEqual(parseExperienceFlagValue(''), { answer: '', detail: '' })
  })

  it('formats empty answer as blank and No without detail', () => {
    assert.equal(formatExperienceFlagValue('', 'ignored'), '')
    assert.equal(formatExperienceFlagValue('no', 'should drop'), 'No')
  })

  it('classifies flag keys', () => {
    assert.equal(isSnapshotExperienceFlag('snapshot_travel_experience'), true)
    assert.equal(isSnapshotExperienceFlag('snapshot_specialty'), false)
  })
})

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
    assert.equal(snapshot.snapshot_trauma_experience?.value, 'Yes — Level I & II')
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
  it('emits snapshot_lines from derived employer data', () => {
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
    const texts = (data.snapshot_lines || []).map(row => row.snapshot_line)
    assert.ok(texts.some(t => t === 'Specialty: ICU'))
    assert.ok(texts.some(t => t === 'Years of Experience: 8'))
    assert.ok(texts.some(t => t.startsWith('Travel Experience:')))
    assert.ok(texts.some(t => t === 'Trauma Experience: Yes — Level I'))
    assert.ok(texts.some(t => t === 'Teaching Facility Experience: Yes'))
    assert.ok(texts.some(t => t === 'Charge Nurse Experience: Yes'))
    assert.equal(texts.some(t => t.startsWith('Magnet Facility Experience:')), false)
    assert.ok(texts.some(t => /EMR Systems:.*Epic/.test(t)))
  })

  it('omits unchecked snapshot lines from rendered DOCX with no empty bullets', async () => {
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
        snapshot_equipment_skills: { value: 'ECMO', included: true },
      },
    })
    const zip = new PizZip(buffer)
    const xml = zip.file('word/document.xml').asText()
    const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    assert.match(text, /Specialty:\s*ICU/)
    assert.match(text, /Equipment\/Skills:\s*ECMO/)
    assert.equal(text.includes('Years of Experience:'), false)
    assert.equal(text.includes('Travel Experience:'), false)
    // Only included snapshot bullets after the heading (no empty list paragraphs)
    const after = xml.split('PROFESSIONAL SNAPSHOT')[1]?.split('LICENSES')[0] || ''
    const bulletParas = after.match(/<w:numPr>/g) || []
    assert.equal(bulletParas.length, 2)
  })
})

describe('professionalSnapshotToLines', () => {
  it('keeps include order and skips excluded', () => {
    const lines = professionalSnapshotToLines({
      snapshot_specialty: { value: 'ICU', included: true },
      snapshot_years_experience: { value: '8', included: false },
      snapshot_equipment_skills: { value: 'ECMO', included: true },
    })
    assert.deepEqual(
      lines.map(l => l.snapshot_line),
      ['Specialty: ICU', 'Equipment/Skills: ECMO'],
    )
  })
})
