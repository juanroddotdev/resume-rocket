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
      education: [{ degree: 'BSN', school: 'State U', graduationYear: '2016' }],
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
    assert.ok(data.professional_experiences.length)
    assert.equal(data.BLS_certification_expiration_date, '06/2026')
    assert.equal(data.professional_experiences[0].experience_employment_type, 'Staff')
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
