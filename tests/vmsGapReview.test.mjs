import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeMissingTemplateFields,
  computeEmployerLinkAdvisories,
} from '../utils/vmsGapReview.ts'

/** Minimal form that satisfies all required template fields. */
function completeForm(overrides = {}) {
  return {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    specialties: ['ICU'],
    licenses: [{ state: 'CA', number: 'RN-1' }],
    education: [
      {
        degree: 'BSN',
        school: 'State University',
        graduationMonth: '06',
        graduationYear: '2016',
      },
    ],
    employers: [
      {
        name: 'Metro Hospital',
        hospitalId: 'hosp-1',
        startDate: '2020-01',
        endDate: '2024-01',
        patientScope: 'Adult ICU',
        emrSystem: 'Epic',
      },
    ],
    ...overrides,
  }
}

describe('computeMissingTemplateFields', () => {
  it('returns empty when all required fields are present', () => {
    assert.deepEqual(computeMissingTemplateFields(completeForm()), [])
  })

  it('flags missing identity fields including whitespace-only', () => {
    const missing = computeMissingTemplateFields(
      completeForm({
        first_name: '   ',
        last_name: '',
        email: null,
        phone: undefined,
      }),
    )
    const ids = missing.map((m) => m.id)
    assert.deepEqual(ids.filter((id) => ['first_name', 'last_name', 'email', 'phone'].includes(id)).sort(), [
      'email',
      'first_name',
      'last_name',
      'phone',
    ])
    assert.ok(missing.every((m) => m.step === 1 || !['first_name', 'last_name', 'email', 'phone'].includes(m.id)))
  })

  it('flags empty specialties array and blank first specialty', () => {
    assert.ok(
      computeMissingTemplateFields(completeForm({ specialties: [] })).some((m) => m.id === 'specialties'),
    )
    assert.ok(
      computeMissingTemplateFields(completeForm({ specialties: ['  '] })).some((m) => m.id === 'specialties'),
    )
  })

  it('flags missing employers list', () => {
    const missing = computeMissingTemplateFields(completeForm({ employers: [] }))
    assert.ok(missing.some((m) => m.id === 'employers' && m.step === 2))
  })

  it('flags per-employer start, end, patient scope, and EMR gaps', () => {
    const missing = computeMissingTemplateFields(
      completeForm({
        employers: [
          {
            name: 'Metro Hospital',
            startDate: ' ',
            endDate: '',
            patientScope: null,
            emrSystem: '',
          },
        ],
      }),
    )
    const ids = missing.map((m) => m.id)
    assert.ok(ids.includes('employer-0-start'))
    assert.ok(ids.includes('employer-0-end'))
    assert.ok(ids.includes('employer-0-scope'))
    assert.ok(ids.includes('employer-0-emr'))
    assert.ok(missing.filter((m) => m.id.startsWith('employer-0-')).every((m) => m.step === 2))
  })

  it('flags EMR for each incomplete employer index', () => {
    const missing = computeMissingTemplateFields(
      completeForm({
        employers: [
          {
            name: 'A',
            startDate: '2020-01',
            endDate: '2021-01',
            patientScope: 'ICU',
            emrSystem: 'Epic',
          },
          {
            name: 'B',
            startDate: '2022-01',
            endDate: 'Present',
            patientScope: 'Med-Surg',
            emrSystem: '',
          },
        ],
      }),
    )
    assert.ok(missing.some((m) => m.id === 'employer-1-emr'))
    assert.equal(missing.some((m) => m.id === 'employer-0-emr'), false)
  })

  it('accepts long specialty and employer strings without false gaps', () => {
    const long = `Specialty-${'x'.repeat(200)}`
    const missing = computeMissingTemplateFields(
      completeForm({
        specialties: [long],
        employers: [
          {
            name: `Hospital-${'y'.repeat(300)}`,
            hospitalId: 'hosp-1',
            startDate: '2020-01',
            endDate: '2024-01',
            patientScope: `Scope-${'z'.repeat(100)}`,
            emrSystem: 'Epic',
          },
        ],
      }),
    )
    assert.deepEqual(missing, [])
  })

  it('flags missing licenses when none provided', () => {
    const missing = computeMissingTemplateFields(
      completeForm({ licenses: [], license_state: '', license_number: '' }),
    )
    assert.ok(missing.some((m) => m.id === 'licenses' && m.step === 3))
  })

  it('accepts legacy license_state + license_number scalars', () => {
    const missing = computeMissingTemplateFields(
      completeForm({
        licenses: [],
        license_state: 'TX',
        license_number: 'RN-999',
      }),
    )
    assert.equal(missing.some((m) => m.id.startsWith('license')), false)
  })

  it('flags incomplete license rows by index', () => {
    const missing = computeMissingTemplateFields(
      completeForm({
        licenses: [{ state: '  ', number: '' }, { state: 'CA', number: 'RN-2' }],
      }),
    )
    // Second row is complete → hasCompleteLicense true → no license gaps
    assert.equal(missing.some((m) => m.id.startsWith('license')), false)

    const incompleteOnly = computeMissingTemplateFields(
      completeForm({
        licenses: [{ state: 'CA', number: '  ' }],
      }),
    )
    assert.ok(incompleteOnly.some((m) => m.id === 'license-0-number'))
  })

  it('flags missing education and incomplete education rows', () => {
    assert.ok(
      computeMissingTemplateFields(completeForm({ education: [] })).some((m) => m.id === 'education'),
    )

    const missing = computeMissingTemplateFields(
      completeForm({
        education: [
          {
            degree: ' ',
            school: '',
            graduationMonth: '13',
            graduationYear: '',
          },
        ],
      }),
    )
    const ids = missing.map((m) => m.id)
    assert.ok(ids.includes('education-0-degree'))
    assert.ok(ids.includes('education-0-school'))
    assert.ok(ids.includes('education-0-month'))
    assert.ok(ids.includes('education-0-year'))
  })

  it('accepts named graduation month via normalizeGraduationMonth', () => {
    const missing = computeMissingTemplateFields(
      completeForm({
        education: [
          {
            degree: 'BSN',
            school: 'State',
            graduationMonth: 'June',
            graduationYear: '2016',
          },
        ],
      }),
    )
    assert.equal(missing.some((m) => m.id === 'education-0-month'), false)
  })

  it('assigns step numbers by section', () => {
    const missing = computeMissingTemplateFields({})
    assert.ok(missing.some((m) => m.id === 'first_name' && m.step === 1))
    assert.ok(missing.some((m) => m.id === 'specialties' && m.step === 2))
    assert.ok(missing.some((m) => m.id === 'employers' && m.step === 2))
    assert.ok(missing.some((m) => m.id === 'licenses' && m.step === 3))
    assert.ok(missing.some((m) => m.id === 'education' && m.step === 3))
  })
})

describe('computeEmployerLinkAdvisories', () => {
  it('returns empty when there are no employers', () => {
    assert.deepEqual(computeEmployerLinkAdvisories({ employers: [] }), [])
    assert.deepEqual(computeEmployerLinkAdvisories({}), [])
  })

  it('advises when hospitalId is missing', () => {
    const advisories = computeEmployerLinkAdvisories({
      employers: [{ name: 'Metro Hospital' }],
    })
    assert.equal(advisories.length, 1)
    assert.equal(advisories[0].id, 'employer-0-link')
    assert.equal(advisories[0].step, 2)
    assert.match(advisories[0].label, /Metro Hospital/)
  })

  it('skips employers that already have hospitalId', () => {
    const advisories = computeEmployerLinkAdvisories({
      employers: [
        { name: 'Linked', hospitalId: 'abc' },
        { name: 'Unlinked' },
      ],
    })
    assert.equal(advisories.length, 1)
    assert.equal(advisories[0].id, 'employer-1-link')
  })

  it('still advises when name is empty but hospitalId is missing', () => {
    const advisories = computeEmployerLinkAdvisories({
      employers: [{ name: '' }],
    })
    assert.equal(advisories.length, 1)
    assert.match(advisories[0].label, /^: link facility/)
  })
})
