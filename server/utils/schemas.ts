import { z } from 'zod'
import {
  normalizeCredentials,
  normalizeEducation,
  normalizeEmployers,
} from '~/server/utils/normalizeCandidate'

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
})

const credentialInputSchema = z.union([
  z.boolean(),
  z.object({
    active: z.boolean(),
    expiry: z.string().optional(),
  }),
])

export const candidatePatchSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  license_state: z.string().optional(),
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
  preferred_hospital_id: z.string().uuid().optional().nullable(),
  emr_system: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'confirmed', 'archived']).optional(),
})

export const inviteCreateSchema = z.object({
  candidate_email: z.string().email().optional(),
  expires_in_days: z.number().min(1).max(30).default(7),
  label: z.string().optional(),
})
