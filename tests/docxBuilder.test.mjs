import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

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
      }],
    })

    assert.ok(data.candidate_first_name)
    assert.ok(data.education.length)
    assert.equal(data.education[0].education_graduation_year, '05/2016')
    assert.ok(data.professional_experiences.length)
    assert.equal(data.BLS_certification_expiration_date, '06/2026')
    assert.equal(data.professional_experiences[0].experience_employment_type, 'Staff')
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
    assert.match(data.facility_types_trauma_levels, /Level III Trauma/)
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
})
