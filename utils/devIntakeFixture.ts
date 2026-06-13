/** Synthetic parse API payloads for local dev — no upload or Gemini. */

import type { CredentialsMap } from '../types/candidate'

export type DevIntakeParsePayload = {
  candidateId?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  emr_system?: string
  specialties?: string[]
  years_nursing_experience?: string
  compact_license_status?: string
  average_patient_ratios?: string
  specialized_medical_equipment?: string
  education?: Array<{ degree?: string; school?: string; graduationMonth?: string; graduationYear?: string }>
  suggested_employers?: Array<Record<string, unknown>>
  detected_credentials?: string[]
  credentials?: CredentialsMap
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
    specialties: ['Med/Surg', 'Telemetry'],
    years_nursing_experience: '6',
    education: [
      {
        degree: 'BSN',
        school: 'Ohio State University',
      },
    ],
    suggested_employers: [
      {
        name: 'Riverside Methodist Hospital',
        city: 'Columbus',
        state: 'OH',
        role: 'Registered Nurse — Med/Surg',
        startDate: '2021-03',
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
        traumaLevel: 'III',
        teachingStatus: false,
      },
    ],
    detected_credentials: ['BLS', 'ACLS'],
    fields_found: 14,
    partial_parse: true,
    document_scan: false,
  }
}

/** Complete parse — mirrors scripts/test-docx-mapping.mjs for gap-review-clear / DOCX smoke. */
export function buildDevIntakeParsePayloadComplete(candidateId?: string | null): DevIntakeParsePayload {
  return {
    candidateId: candidateId || undefined,
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 123-4567',
    license_number: 'RN-123456',
    license_state: 'CA',
    emr_system: 'Epic',
    years_nursing_experience: '8',
    compact_license_status: 'Yes',
    average_patient_ratios: '1:4 ICU, 1:6 Med-Surg',
    specialized_medical_equipment: 'ECMO, CRRT, ventilators',
    specialties: ['ICU', 'Med-Surg'],
    credentials: {
      BLS: { active: true, expiry: '06/2026' },
      ACLS: { active: true, expiry: '08/2026' },
      PALS: { active: true, expiry: '01/2027' },
      CCRN: { active: true },
    },
    education: [
      { degree: 'BSN', school: 'University of California', graduationMonth: '06', graduationYear: '2016' },
    ],
    suggested_employers: [
      {
        name: 'Mayo Clinic',
        role: 'Staff RN — ICU',
        city: 'Rochester',
        state: 'MN',
        beds: 500,
        traumaLevel: 'I',
        teachingStatus: true,
        startDate: '2020-01',
        endDate: '2024-06',
        employmentType: 'Staff',
        unitBedCount: '24',
        patientScope: 'Adult ICU — critical care',
        avgDailyPatients: '2-3',
        patientAcuity: 'High acuity',
        floatedUnits: ['ER', 'Step-down'],
        equipmentProcedures: ['ECMO', 'CRRT', 'Ventilator management'],
        highlights: ['Charge nurse 18 months', 'Preceptor for new grads'],
        chargeNurseExperience: true,
        preceptorExperience: true,
      },
      {
        name: 'General Hospital',
        role: 'Travel RN — Med/Surg',
        city: 'Austin',
        state: 'TX',
        beds: 320,
        traumaLevel: 'II',
        teachingStatus: false,
        startDate: '2018-03',
        endDate: '2019-12',
        employmentType: 'Travel',
        unitBedCount: '32',
        patientScope: 'Med-Surg telemetry',
        avgDailyPatients: '5-6',
        patientAcuity: 'Moderate',
        floatedUnits: ['ICU'],
        equipmentProcedures: ['IV therapy', 'Wound care'],
        highlights: ['Consistent patient satisfaction scores'],
      },
    ],
    fields_found: 42,
    partial_parse: false,
    document_scan: false,
  }
}
