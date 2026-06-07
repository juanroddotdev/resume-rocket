import type { CandidateDraftInput } from '~/types/candidate'

/** True when the wizard has meaningful data beyond a blank upload step. */
export function hasIntakeDraftData(
  form: CandidateDraftInput & {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    employers?: unknown[]
    education?: unknown[]
  },
  candidateId?: string | null,
) {
  if (candidateId) return true
  return Boolean(
    form.first_name?.trim()
    || form.last_name?.trim()
    || form.email?.trim()
    || form.phone?.trim()
    || form.license_number?.trim()
    || form.license_state?.trim()
    || form.employers?.length
    || form.education?.length
    || form.specialties?.length
  )
}

export const REPLACE_RESUME_CONFIRM =
  'Upload a new resume? Your current answers stay saved — we’ll merge any new fields from the file.'
