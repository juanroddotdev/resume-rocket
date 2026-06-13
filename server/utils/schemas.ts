import { z } from 'zod'
import {
  normalizeCredentials,
  normalizeEducation,
  normalizeEmployers,
} from '~/server/utils/normalizeCandidate'
import { legacyScalarsFromLicenses, normalizeLicenses } from '~/utils/licenseRows'

const stringArrayInput = z.array(z.union([z.string(), z.number()])).optional()

/** Permissive ingress — normalized to camelCase via normalizeEmployers. */
export const employerInputSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  hospitalId: z.string().uuid().optional(),
  hospital_id: z.string().uuid().optional(),
  beds: z.number().optional(),
  traumaLevel: z.string().optional(),
  trauma_level: z.string().optional(),
  teachingStatus: z.boolean().optional(),
  teaching_status: z.boolean().optional(),
  employmentType: z.string().optional(),
  employment_type: z.string().optional(),
  unitBedCount: z.string().optional(),
  unit_bed_count: z.string().optional(),
  patientScope: z.string().optional(),
  patient_scope: z.string().optional(),
  floatedUnits: stringArrayInput,
  floated_units: stringArrayInput,
  equipmentProcedures: stringArrayInput,
  equipment_procedures: stringArrayInput,
  avgDailyPatients: z.string().optional(),
  avg_daily_patients: z.string().optional(),
  average_daily_patients: z.string().optional(),
  patientAcuity: z.string().optional(),
  patient_acuity: z.string().optional(),
  highlights: stringArrayInput,
  chargeNurseExperience: z.boolean().optional(),
  charge_nurse_experience: z.boolean().optional(),
  preceptorExperience: z.boolean().optional(),
  preceptor_experience: z.boolean().optional(),
  emrSystem: z.string().optional(),
  emr_system: z.string().optional(),
  prnSchedule: z.string().optional(),
  prn_schedule: z.string().optional(),
})

const credentialInputSchema = z.union([
  z.boolean(),
  z.object({
    active: z.boolean(),
    expiry: z.string().optional(),
  }),
])

const compactLicenseSchema = z
  .string()
  .optional()
  .transform(s => {
    if (s === undefined) return undefined
    const trimmed = s.trim()
    return trimmed || undefined
  })

const licenseInputSchema = z.record(z.unknown())

export const candidatePatchSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  license_state: z.string().optional(),
  licenses: z
    .array(licenseInputSchema)
    .optional()
    .transform(arr => (arr !== undefined ? normalizeLicenses(arr) : undefined)),
  specialties: z.array(z.string()).optional(),
  credentials: z
    .record(z.string(), credentialInputSchema)
    .optional()
    .transform(c => (c !== undefined ? normalizeCredentials(c) : undefined)),
  employers: z
    .array(employerInputSchema)
    .optional()
    .transform(arr => (arr !== undefined ? normalizeEmployers(arr) : undefined)),
  education: z
    .array(z.record(z.unknown()))
    .optional()
    .transform(arr => (arr !== undefined ? normalizeEducation(arr) : undefined)),
  years_nursing_experience: z.string().optional(),
  compact_license_status: compactLicenseSchema,
  average_patient_ratios: z.string().optional(),
  specialized_medical_equipment: z.string().optional(),
  preferred_hospital_id: z.string().uuid().optional().nullable(),
  emr_system: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'confirmed', 'archived']).optional(),
})

export const inviteCreateSchema = z.object({
  candidate_email: z.string().email().optional(),
  expires_in_days: z.number().min(1).max(30).default(7),
  label: z.string().optional(),
})
