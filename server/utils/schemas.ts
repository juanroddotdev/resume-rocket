import { z } from 'zod'

export const employerSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  hospitalId: z.string().uuid().optional(),
  beds: z.number().optional(),
  traumaLevel: z.string().optional(),
})

export const candidatePatchSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  license_state: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  credentials: z.record(z.boolean()).optional(),
  employers: z.array(employerSchema).optional(),
  preferred_hospital_id: z.string().uuid().optional().nullable(),
  emr_system: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'confirmed', 'archived']).optional(),
})

export const inviteCreateSchema = z.object({
  candidate_email: z.string().email().optional(),
  expires_in_days: z.number().min(1).max(30).default(7),
  label: z.string().optional(),
})
