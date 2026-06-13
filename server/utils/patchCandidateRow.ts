import type { z } from 'zod'
import { candidatePatchSchema } from '~/server/utils/schemas'

type CandidatePatchBody = z.infer<typeof candidatePatchSchema>

export async function patchCandidateRow(candidateId: string, body: CandidatePatchBody) {
  const supabase = useSupabaseAdmin()

  const { data: existing } = await supabase
    .from('candidates')
    .select('status')
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

  const patch = { ...body }
  if (patch.email === '') patch.email = undefined

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
