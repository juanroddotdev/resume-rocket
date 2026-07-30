import { z } from 'zod'

const optionalName = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : typeof v === 'string' ? v.trim() : v),
  z.string().min(1).max(100).optional(),
)

/**
 * Admin create-invite body.
 * Names required for the Send-link path (validated in UI); optional for upload/scratch drafts.
 */
export const inviteCreateSchema = z.object({
  candidate_first_name: optionalName,
  candidate_last_name: optionalName,
  candidate_email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : typeof v === 'string' ? v.trim() : v),
    z.string().email().optional(),
  ),
  expires_in_days: z.number().min(1).max(30).default(7),
  label: z.string().optional(),
})
