import { candidatePatchSchema } from '~/server/utils/schemas'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await requireInviteForCandidate(event, id)
  const body = candidatePatchSchema.parse(await readBody(event))
  const supabase = useSupabaseAdmin()

  const { data: existing } = await supabase
    .from('candidates')
    .select('status')
    .eq('id', id)
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
    .eq('id', id)
    .select('id, status, updated_at')
    .single()

  if (error) throw error

  if (body.status === 'submitted') {
    await supabase
      .from('intake_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('candidate_id', id)
  }

  return data
})
