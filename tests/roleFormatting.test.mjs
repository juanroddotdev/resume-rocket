import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatEmployerRoleForDocx,
  normalizeEmployerRole,
  roleDetailsForDocx,
} from '../utils/roleFormatting.ts'
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

describe('formatEmployerRoleForDocx', () => {
  it('prefixes travel type without RN by default', () => {
    const formatted = formatEmployerRoleForDocx(
      {
        role: 'Travel Registered Nurse, Med Surg / Telemetry',
        employmentType: 'Travel',
      },
      'Med Surg',
    )
    assert.equal(formatted.unitSpecialty, 'Travel — Med Surg/Telemetry')
    assert.equal(formatted.roleDetails, '')
    assert.equal(formatted.displayRole, 'Travel RN — Med Surg/Telemetry')
  })

  it('adds RN to travel heading when opted in', () => {
    const formatted = formatEmployerRoleForDocx(
      {
        role: 'Travel Registered Nurse, Med Surg / Telemetry',
        employmentType: 'Travel',
      },
      'Med Surg',
      { includeRnPrefix: true },
    )
    assert.equal(formatted.unitSpecialty, 'Travel RN — Med Surg/Telemetry')
  })

  it('keeps concise travel role as type-only heading without RN', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'Travel RN', employmentType: 'Travel' },
      'Med Surg',
    )
    assert.equal(formatted.unitSpecialty, 'Travel')
    assert.equal(formatted.roleDetails, '')
  })

  it('prefixes staff type and keeps PICU RN in the role body', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'PICU RN', employmentType: 'Staff' },
      'PICU',
    )
    assert.equal(formatted.unitSpecialty, 'Staff — PICU RN')
    assert.equal(formatted.roleDetails, '')
  })

  it('does not double RN when the role already has a credential', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'PICU RN', employmentType: 'Staff' },
      'PICU',
      { includeRnPrefix: true },
    )
    assert.equal(formatted.unitSpecialty, 'Staff — PICU RN')
  })

  it('abbreviates staff registered nurse titles without a leading RN', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'Registered Nurse - Recovery Medicine', employmentType: 'Staff' },
      '',
    )
    assert.equal(formatted.unitSpecialty, 'Staff — Recovery Medicine')
    assert.equal(formatted.roleDetails, '')
  })

  it('falls back to candidate specialty with employment type when role is empty', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: '', employmentType: 'Travel' },
      'Telemetry',
    )
    assert.equal(formatted.unitSpecialty, 'Travel — Telemetry')
    assert.equal(formatted.displayRole, '')
  })

  it('prefixes PRN and includes typical schedule in the heading', () => {
    const formatted = formatEmployerRoleForDocx(
      { role: 'ED', employmentType: 'PRN', prnSchedule: '2 shifts/month' },
      '',
    )
    assert.equal(formatted.unitSpecialty, 'PRN (2 shifts/month) — ED')
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
  it('renders employment type on the experience heading without RN by default', () => {
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
    assert.equal(exp.experience_unit_specialty, 'Travel (13-week contract) — Med Surg/Telemetry')
    assert.equal(exp.experience_role_details, '')
    assert.equal(exp.experience_employment_type, 'Travel — 13-week contract')
  })

  it('prefixes RN on the heading when include_rn_experience_prefix is true', () => {
    const data = mapCandidateToTemplateData({
      first_name: 'Jenny',
      last_name: 'Nguyen',
      specialties: ['Med Surg'],
      include_rn_experience_prefix: true,
      employers: [{
        name: 'Kaiser Permanente West Los Angeles Medical Center',
        role: 'Med Surg',
        employmentType: 'Travel',
      }],
    })

    assert.equal(
      data.professional_experiences[0].experience_unit_specialty,
      'Travel RN — Med Surg',
    )
  })
})
