import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatEmployerRoleForDocx,
  normalizeEmployerRole,
  roleDetailsForDocx,
} from '../utils/roleFormatting.ts'
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

describe('formatEmployerRoleForDocx', () => {
  it('abbreviates travel registered nurse with specialty suffix', () => {
    const formatted = formatEmployerRoleForDocx(
      {
        role: 'Travel Registered Nurse, Med Surg / Telemetry',
        employmentType: 'Travel',
      },
      'Med Surg',
    )
    assert.equal(formatted.unitSpecialty, 'Travel RN — Med Surg/Telemetry')
    assert.equal(formatted.roleDetails, '')
    assert.equal(formatted.displayRole, 'Travel RN — Med Surg/Telemetry')
  })

  it('keeps concise travel RN without extra detail line', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'Travel RN', employmentType: 'Travel' },
      'Med Surg',
    )
    assert.equal(formatted.unitSpecialty, 'Travel RN')
    assert.equal(formatted.roleDetails, '')
  })

  it('omits redundant PICU role details', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'PICU RN', employmentType: 'Staff' },
      'PICU',
    )
    assert.equal(formatted.unitSpecialty, 'PICU RN')
    assert.equal(formatted.roleDetails, '')
  })

  it('abbreviates staff registered nurse titles', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'Registered Nurse - Recovery Medicine', employmentType: 'Staff' },
      '',
    )
    assert.equal(formatted.unitSpecialty, 'RN — Recovery Medicine')
    assert.equal(formatted.roleDetails, '')
  })

  it('falls back to candidate specialty when role is empty', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: '', employmentType: 'Travel' },
      'Telemetry',
    )
    assert.equal(formatted.unitSpecialty, 'Telemetry')
    assert.equal(formatted.displayRole, 'Telemetry')
  })
})

describe('normalizeEmployerRole', () => {
  it('returns compact travel role for storage', () => {
    assert.equal(
      normalizeEmployerRole('Travel Registered Nurse, Med Surg / Telemetry', {
        employmentType: 'Travel',
      }),
      'Travel RN — Med Surg/Telemetry',
    )
  })
})

describe('roleDetailsForDocx', () => {
  it('drops details that repeat unit specialty', () => {
    assert.equal(roleDetailsForDocx('PICU RN', 'PICU RN'), '')
    assert.equal(roleDetailsForDocx('PICU', 'PICU RN', 'PICU'), '')
  })
})

describe('mapCandidateToTemplateData travel role wiring', () => {
  it('renders compact travel role in experience_unit_specialty', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jenny',
      last_name: 'Nguyen',
      specialties: ['Med Surg', 'Telemetry'],
      employers: [{
        name: 'Kaiser Permanente West Los Angeles Medical Center',
        role: 'Travel Registered Nurse, Med Surg / Telemetry',
        employmentType: 'Travel',
        travelDetail: '13-week contract',
        emrSystem: 'Epic',
      }],
    })

    const exp = data.professional_experiences[0]
    assert.equal(exp.experience_unit_specialty, 'Travel RN — Med Surg/Telemetry')
    assert.equal(exp.experience_role_details, '')
    assert.equal(exp.experience_employment_type, 'Travel — 13-week contract')
  })
})
