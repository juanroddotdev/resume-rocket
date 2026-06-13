import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPacketPreviewSections } from '../utils/packetPreviewSections.ts'

describe('buildPacketPreviewSections', () => {
  it('maps identity, licenses, and clinical summary', () => {
    const sections = buildPacketPreviewSections({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '555-0100',
      licenses: [
        { state: 'CA', number: 'RN-1', expiry: '06/2027' },
        { state: 'TX', number: 'RN-2' },
      ],
      compact_license_status: 'Yes',
      specialties: ['ICU', 'ER'],
      years_nursing_experience: '8',
      average_patient_ratios: '1:4',
      specialized_medical_equipment: 'Ventilators',
    })

    assert.equal(sections.identity[0].value, 'Jane Doe')
    assert.deepEqual(sections.licenses, ['CA · RN-1 · 06/2027', 'TX · RN-2'])
    assert.equal(sections.compactLicenseStatus, 'Yes')
    assert.equal(sections.clinical[0].value, 'ICU, ER')
    assert.equal(sections.clinical[1].value, '8')
  })

  it('formats employer PRN schedule and EMR Other', () => {
    const sections = buildPacketPreviewSections({
      first_name: 'Jane',
      last_name: 'Doe',
      employers: [{
        name: 'Metro Hospital',
        role: 'Staff RN',
        city: 'Austin',
        state: 'TX',
        startDate: '01/2020',
        endDate: '06/2024',
        employmentType: 'PRN',
        prnSchedule: '2 shifts/month',
        emrSystem: 'Custom EMR Pro',
        patientScope: 'Adult Med-Surg',
        patientAcuity: 'Moderate',
        highlights: ['Charge nurse'],
      }],
    })

    assert.equal(sections.employers.length, 1)
    const employer = sections.employers[0]
    const typeField = employer.fields.find(f => f.label === 'Employment type')
    const emrField = employer.fields.find(f => f.label === 'EMR platform')
    assert.equal(typeField?.value, 'PRN — 2 shifts/month')
    assert.equal(emrField?.value, 'Custom EMR Pro')
    assert.ok(employer.highlights.includes('Charge nurse'))
  })

  it('maps active certifications and education graduation', () => {
    const sections = buildPacketPreviewSections({
      first_name: 'Jane',
      last_name: 'Doe',
      credentials: {
        BLS: { active: true, expiry: '06/2026' },
        ACLS: { active: true },
      },
      education: [{
        degree: 'BSN',
        school: 'State University',
        graduationMonth: '05',
        graduationYear: '2018',
      }],
    })

    assert.equal(sections.certifications.length, 2)
    assert.equal(sections.certifications.find(c => c.name === 'BLS')?.expiry, '06/2026')
    assert.equal(sections.education[0].graduation, '05/2018')
  })

  it('uses em dash placeholder for empty optional values', () => {
    const sections = buildPacketPreviewSections({
      first_name: 'Jane',
      last_name: 'Doe',
    })

    assert.equal(sections.licenses[0], '—')
    assert.equal(sections.clinical[0].value, '—')
    assert.deepEqual(sections.employers, [])
    assert.deepEqual(sections.education, [])
  })
})
