import type { z } from 'zod'
import { legacyScalarsFromLicenses } from '~/utils/licenseRows'
import { isCandidatePatchLocked } from '~/utils/candidatePatchLock'
import { isAllowedStatusPatch } from '~/utils/candidateStatusPatch'
import { candidatePatchSchema } from '~/server/utils/schemas'
import { normalizeCandidateRow } from '~/server/utils/normalizeCandidate'
import { mergeDerivedSnapshotIntoStored, normalizeProfessionalSnapshot } from '~/utils/professionalSnapshot'

type CandidatePatchBody = z.infer<typeof candidatePatchSchema>

const SNAPSHOT_FEED_KEYS = [
  'employers',
  'specialties',
  'years_nursing_experience',
  'average_patient_ratios',
  'specialized_medical_equipment',
  'emr_system',
] as const

function patchTouchesSnapshotFeeds(patch: CandidatePatchBody): boolean {
  return SNAPSHOT_FEED_KEYS.some(key => patch[key] !== undefined)
}

export async function patchCandidateRow(candidateId: string, body: CandidatePatchBody) {
  const supabase = useSupabaseAdmin()

  const { data: existing } = await supabase
    .from('candidates')
    .select(
      'status, employers, specialties, years_nursing_experience, average_patient_ratios, specialized_medical_equipment, emr_system, professional_snapshot',
    )
    .eq('id', candidateId)
    .single()

  if (isCandidatePatchLocked(existing?.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Candidate already submitted',
    })
  }

  if (!isAllowedStatusPatch(existing?.status, body.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid status transition',
    })
  }

  const patch: Record<string, unknown> = { ...body }
  if (patch.email === '') patch.email = undefined
  if (patch.licenses !== undefined) {
    Object.assign(patch, legacyScalarsFromLicenses(patch.licenses as never))
  }

  // Refresh derived snapshot when feed fields change; merge preserves pinned/manual lines.
  if (patchTouchesSnapshotFeeds(body) && existing) {
    const normalized = normalizeCandidateRow({
      ...existing,
      ...patch,
    } as Record<string, unknown>)
    const candidateInput = {
      specialties: normalized.specialties as string[] | null,
      years_nursing_experience: normalized.years_nursing_experience as string | null,
      average_patient_ratios: normalized.average_patient_ratios as string | null,
      specialized_medical_equipment: normalized.specialized_medical_equipment as string | null,
      emr_system: normalized.emr_system as string | null,
      employers: normalized.employers,
    }
    const stored =
      body.professional_snapshot !== undefined
        ? body.professional_snapshot
        : normalizeProfessionalSnapshot(existing.professional_snapshot)
    patch.professional_snapshot = mergeDerivedSnapshotIntoStored(stored, candidateInput)
  }

  const { data, error } = await supabase
    .from('candidates')
    .update(patch)
    .eq('id', candidateId)
    .select('id, status, updated_at')
    .single()

  if (error) throw error

  if (body.status === 'submitted') {
    await supabase
      .from('intake_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('candidate_id', candidateId)
  }

  return data
}
