import type { z } from 'zod'
import { legacyScalarsFromLicenses } from '~/utils/licenseRows'
import { candidatePatchSchema } from '~/server/utils/schemas'
import { normalizeCandidateRow } from '~/server/utils/normalizeCandidate'
import { buildProfessionalSnapshotFromCandidate } from '~/utils/professionalSnapshot'

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

  if (
    existing?.status === 'submitted'
    || existing?.status === 'confirmed'
  ) {
    if (body.status !== 'submitted') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Candidate already submitted',
      })
    }
  }

  const patch: Record<string, unknown> = { ...body }
  if (patch.email === '') patch.email = undefined
  if (patch.licenses !== undefined) {
    Object.assign(patch, legacyScalarsFromLicenses(patch.licenses as never))
  }

  // Phase 2: refresh derived snapshot when feed fields change (before admin manual edits).
  if (body.professional_snapshot === undefined && patchTouchesSnapshotFeeds(body) && existing) {
    const normalized = normalizeCandidateRow({
      ...existing,
      ...patch,
    } as Record<string, unknown>)
    patch.professional_snapshot = buildProfessionalSnapshotFromCandidate({
      specialties: normalized.specialties as string[] | null,
      years_nursing_experience: normalized.years_nursing_experience as string | null,
      average_patient_ratios: normalized.average_patient_ratios as string | null,
      specialized_medical_equipment: normalized.specialized_medical_equipment as string | null,
      emr_system: normalized.emr_system as string | null,
      employers: normalized.employers,
    })
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
