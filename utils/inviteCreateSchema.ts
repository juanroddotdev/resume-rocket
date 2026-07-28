import { z } from 'zod'

/** Admin create-invite body — first/last required; email optional. */
export const inviteCreateSchema = z.object({
  candidate_first_name: z.string().trim().min(1).max(100),
  candidate_last_name: z.string().trim().min(1).max(100),
  candidate_email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : typeof v === 'string' ? v.trim() : v),
    z.string().email().optional(),
  ),
  expires_in_days: z.number().min(1).max(30).default(7),
  label: z.string().optional(),
})
