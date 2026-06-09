/** Synthetic parse API payload for local dev — partial data with realistic gaps. */

export type DevIntakeParsePayload = {
  candidateId?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  specialties?: string[]
  years_nursing_experience?: string
  compact_license_status?: string
  average_patient_ratios?: string
  specialized_medical_equipment?: string
  education?: Array<{ degree?: string; school?: string; graduationYear?: string }>
  suggested_employers?: Array<Record<string, unknown>>
  detected_credentials?: string[]
  fields_found?: number
  partial_parse?: boolean
  document_scan?: boolean
}

/** Placeholder hospital ids — valid UUIDs so PATCH schema accepts linked dev suggestions. */
const DEV_HOSPITAL_SUGGESTIONS = [
  {
    id: 'a1000001-0000-4000-8000-000000000001',
    name: 'Riverside Methodist Hospital',
    city: 'Columbus',
    state: 'OH',
    beds: 1059,
    trauma_level: 'I',
    teaching_status: true,
    score: 0.92,
  },
  {
    id: 'a1000001-0000-4000-8000-000000000002',
    name: 'OhioHealth Riverside',
    city: 'Columbus',
    state: 'OH',
    beds: 1059,
    trauma_level: 'I',
    teaching_status: true,
    score: 0.88,
  },
]

/** Partial parse: identity + employers + some clinical fields; license, EMR, and VMS employer gaps remain. */
export function buildDevIntakeParsePayload(candidateId?: string | null): DevIntakeParsePayload {
  return {
    candidateId: candidateId || undefined,
    first_name: 'Allison',
    last_name: 'Coon',
    email: 'allison.coon@example.com',
    phone: '(614) 555-0198',
    // license intentionally omitted — Step 3 gate + gap review
    specialties: ['Med/Surg', 'Telemetry'],
    years_nursing_experience: '6',
    // compact_license_status, average_patient_ratios, specialized_medical_equipment omitted
    education: [
      {
        degree: 'BSN',
        school: 'Ohio State University',
        // graduationYear omitted — gap review on Step 3
      },
    ],
    suggested_employers: [
      {
        name: 'Riverside Methodist Hospital',
        city: 'Columbus',
        state: 'OH',
        role: 'Registered Nurse — Med/Surg',
        startDate: '2021-03',
        // endDate, employmentType, patientScope, patientAcuity, highlights omitted
        unitBedCount: '32',
        floatedUnits: ['ICU', 'Telemetry'],
        employer_hospital_suggestions: DEV_HOSPITAL_SUGGESTIONS,
      },
      {
        name: 'Summit Rural Health Clinic',
        city: 'Granville',
        state: 'OH',
        role: 'Staff Nurse',
        startDate: '2018-06',
        endDate: '2021-02',
        // no hospital link suggestions — tests manual / unlinked advisory
      },
    ],
    detected_credentials: ['BLS', 'ACLS'],
    fields_found: 14,
    partial_parse: true,
    document_scan: false,
  }
}
