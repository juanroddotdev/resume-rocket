/**
 * Smoke test mapGeminiResumeJson (no API call).
 * Usage: node scripts/test-gemini-parse-map.mjs
 */
import { mapGeminiResumeJson } from '../server/utils/geminiShared.ts'

const sample = mapGeminiResumeJson(
  {
    first_name: 'Jane',
    last_name: 'Doe',
    years_nursing_experience: '8',
    compact_license_status: 'Yes',
    average_patient_ratios: '1:4',
    specialized_medical_equipment: 'ECMO, CRRT',
    education: [
      { degree: 'BSN', school: 'State University', graduation_year: '2016' },
    ],
    certifications: [
      { name: 'BLS', expiry: '2027-01' },
      { name: 'ACLS' },
    ],
    suggested_employers: [
      {
        name: 'Metro Hospital',
        role: 'ICU RN',
        city: 'Austin',
        state: 'TX',
        start_date: '2020-01',
        end_date: '2024-06',
        employment_type: 'Travel',
        unit_bed_count: '24',
        patient_scope: 'Critical Care',
        floated_units: ['Stepdown', 'ER overflow'],
        highlights: ['Charge nurse'],
      },
    ],
  },
  'fallback text',
)

const checks = [
  sample.yearsNursingExperience === '8',
  sample.compactLicenseStatus === 'Yes',
  sample.education?.[0]?.school === 'State University',
  sample.certificationDetails?.find(c => c.name === 'BLS')?.expiry === '2027-01',
  sample.employers?.[0]?.employmentType === 'Travel',
  sample.employers?.[0]?.unitBedCount === '24',
  sample.employers?.[0]?.floatedUnits?.length === 2,
  sample.employers?.[0]?.highlights?.[0] === 'Charge nurse',
  sample.detectedCredentials?.includes('BLS'),
  !Object.prototype.hasOwnProperty.call(sample.employers?.[0] ?? {}, 'beds'),
  !Object.prototype.hasOwnProperty.call(sample.employers?.[0] ?? {}, 'traumaLevel'),
]

if (checks.some(c => !c)) {
  console.error('FAIL: mapGeminiResumeJson sample mapping incomplete', sample)
  process.exit(1)
}

console.log('OK: mapGeminiResumeJson maps VMS Phase C fields')
