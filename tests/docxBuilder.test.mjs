import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapCandidateToTemplateData, sanitizeDocxTemplateData } from '../server/utils/docxBuilder.ts'

function collectUndefinedPaths(value, prefix = '') {
  if (value === undefined) return prefix ? [prefix] : ['root']
  if (value == null || typeof value !== 'object') return []

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectUndefinedPaths(item, prefix ? `${prefix}[${index}]` : `[${index}]`),
    )
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    collectUndefinedPaths(nested, prefix ? `${prefix}.${key}` : key),
  )
}

describe('mapCandidateToTemplateData', () => {
  it('returns a non-empty buffer-ready payload for a complete candidate', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '555-0100',
      license_number: 'RN-1',
      license_state: 'CA',
      emr_system: 'Epic',
      years_nursing_experience: '8',
      compact_license_status: 'Yes',
      average_patient_ratios: '1:4',
      specialized_medical_equipment: 'ECMO',
      specialties: ['ICU'],
      credentials: { BLS: { active: true, expiry: '06/2026' } },
      education: [{ degree: 'BSN', school: 'State U', graduationMonth: '05', graduationYear: '2016' }],
      employers: [{
        name: 'Metro Hospital',
        role: 'ICU RN',
        city: 'Austin',
        state: 'TX',
        startDate: '2020-01',
        endDate: '2024-06',
        employmentType: 'Staff',
        patientScope: 'Adult ICU',
        patientAcuity: 'High',
        highlights: ['Charge nurse'],
        emrSystem: 'Epic',
      }],
    })

    assert.ok(data.candidate_first_name)
    assert.ok(data.education.length)
    assert.equal(data.education[0].education_graduation_year, '05/2016')
    assert.ok(data.professional_experiences.length)
    assert.equal(data.BLS_certification_expiration_date, '06/2026')
    assert.equal(data.professional_experiences[0].experience_employment_type, 'Staff')
    assert.equal(data.professional_experiences[0].experience_patient_acuity_level, 'High')
  })

  it('appends charge and preceptor highlights when employer flags are yes', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      emr_system: 'Epic',
      specialties: ['ICU'],
      employers: [{
        name: 'Metro Hospital',
        role: 'ICU RN',
        chargeNurseExperience: true,
        preceptorExperience: true,
      }],
    })

    assert.deepEqual(data.professional_experiences[0].experience_highlights, [
      'Charge nurse experience',
      'Preceptor experience',
    ])
  })

  it('maps per-employer EMR and union proficiencies', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      specialties: ['ICU'],
      employers: [
        {
          name: 'Metro Hospital',
          role: 'ICU RN',
          emrSystem: 'Epic',
        },
        {
          name: 'Regional Medical',
          role: 'ER RN',
          emrSystem: 'Cerner',
        },
      ],
    })

    assert.equal(data.professional_experiences[0].experience_emr_system, 'Epic')
    assert.equal(data.professional_experiences[1].experience_emr_system, 'Cerner')
    assert.equal(data.emr_software_proficiencies, 'Epic, Cerner')
  })

  it('maps certifications_list with names and expiries for all active credentials', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      credentials: {
        BLS: { active: true, expiry: '06/2026' },
        CCRN: { active: true },
        ARRT: { active: true, expiry: '01/2027' },
      },
    })

    assert.equal(data.core_life_support_certifications, 'BLS, CCRN, ARRT')
    assert.deepEqual(data.certifications_list, [
      { certification_name: 'BLS', certification_expiration_date: '06/2026' },
      { certification_name: 'CCRN', certification_expiration_date: 'Current' },
      { certification_name: 'ARRT', certification_expiration_date: '01/2027' },
    ])
  })

  it('falls back to legacy global emr_system when employers lack per-card EMR', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      emr_system: 'Epic',
      specialties: ['ICU'],
      employers: [{ name: 'Metro Hospital', role: 'ICU RN' }],
    })

    assert.equal(data.emr_software_proficiencies, 'Epic')
    assert.equal(data.professional_experiences[0].experience_emr_system, 'Epic')
  })

  it('maps multi-license rows with expiry in licenses_list', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      licenses: [
        { state: 'CA', number: 'RN-1', expiry: '06/2027' },
        { state: 'TX', number: 'RN-2' },
      ],
      specialties: ['ICU'],
      employers: [{ name: 'Metro Hospital', role: 'ICU RN', emrSystem: 'Epic' }],
    })

    assert.deepEqual(data.active_licenses_list, [
      'CA · RN-1 · 06/2027',
      'TX · RN-2',
    ])
    assert.deepEqual(data.licenses_list, [
      { rn_license_state_and_expiry: 'CA · RN-1 · 06/2027' },
      { rn_license_state_and_expiry: 'TX · RN-2' },
    ])
  })

  it('appends PRN schedule to employment type in DOCX', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      specialties: ['Med-Surg'],
      employers: [{
        name: 'Metro Hospital',
        role: 'Staff RN',
        employmentType: 'PRN',
        prnSchedule: '2 shifts/month',
        emrSystem: 'Epic',
      }],
    })

    assert.equal(data.professional_experiences[0].experience_employment_type, 'PRN — 2 shifts/month')
  })

  it('maps manual trauma and teaching for unlinked employers', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      emr_system: 'Epic',
      specialties: ['Med-Surg'],
      employers: [{
        name: 'Summit Rural Health Clinic',
        role: 'Staff RN',
        city: 'Granville',
        state: 'OH',
        traumaLevel: 'III',
        teachingStatus: false,
      }],
    })

    const exp = data.professional_experiences[0]
    assert.equal(exp.experience_trauma_level, 'III')
    assert.equal(exp.experience_is_teaching_facility, 'No')
    assert.equal(data.facility_types_trauma_levels, '')
  })

  it('omits redundant role details when role matches unit specialty', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      last_name: 'Doe',
      specialties: ['PICU'],
      employers: [{
        name: 'Metro Hospital',
        role: 'PICU RN',
        emrSystem: 'Epic',
      }],
    })

    assert.equal(data.professional_experiences[0].experience_unit_specialty, 'PICU RN')
    assert.equal(data.professional_experiences[0].experience_role_details, '')
  })

  it('never leaves undefined template values for sparse candidates', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jane',
      employers: [{
        role: 'ICU RN',
        floatedUnits: ['ICU', undefined, ''],
        equipmentProcedures: [undefined],
        highlights: [undefined, 'Charge nurse'],
      }],
      education: [{ degree: undefined, school: null }],
      specialties: [undefined, 'ICU'],
    })

    assert.deepEqual(collectUndefinedPaths(data), [])
    assert.equal(data.professional_experiences[0].experience_hospital_name, '')
    assert.deepEqual(data.professional_experiences[0].experience_floated_units_list, ['ICU'])
    assert.deepEqual(data.professional_experiences[0].experience_highlights, ['Charge nurse'])
  })

  it('sanitizeDocxTemplateData coerces nullish leaves to empty strings', () => {
    const sanitized = sanitizeDocxTemplateData({
      name: undefined,
      nested: { value: null },
      list: ['ok', undefined, null],
    })

    assert.deepEqual(sanitized, {
      name: '',
      nested: { value: '' },
      list: ['ok'],
    })
  })
})

describe('buildResumeDocx smoke', () => {
  it('generates a non-empty DOCX buffer', async () => {
    const { buildResumeDocx } = await import('../server/utils/docxBuilder.ts')
    const buffer = await buildResumeDocx({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '555-0100',
      license_number: 'RN-1',
      license_state: 'CA',
      emr_system: 'Epic',
      specialties: ['ICU'],
      employers: [{ name: 'Metro Hospital', role: 'ICU RN', city: 'Austin', state: 'TX' }],
    })
    assert.ok(Buffer.isBuffer(buffer))
    assert.ok(buffer.length > 1000)
  })

  it('does not render the literal word undefined in document text', async () => {
    const PizZip = (await import('pizzip')).default
    const { buildResumeDocx } = await import('../server/utils/docxBuilder.ts')
    const buffer = await buildResumeDocx({
      first_name: 'Jane',
      last_name: 'Doe',
      specialties: ['ICU'],
      employers: [{ role: 'ICU RN' }],
      education: [{}],
    })

    const zip = new PizZip(buffer)
    const xml = zip.file('word/document.xml')?.asText() || ''
    assert.ok(xml.length > 0)
    assert.equal(xml.includes('undefined'), false)
  })
})
