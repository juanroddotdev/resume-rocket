export default defineEventHandler(async (event) => {
  const token = getInviteTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Invite token required' })
  }

  const validation = await validateInviteToken(token)
  if (!validation.valid) {
    throw createError({ statusCode: 403, statusMessage: `Invite ${validation.reason}` })
  }

  const supabase = useSupabaseAdmin()
  const invite = validation.invite

  if (invite.candidate_id) {
    const { data: existing } = await supabase
      .from('candidates')
      .select('id, status, created_at')
      .eq('id', invite.candidate_id)
      .single()

    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        created_at: existing.created_at,
        resumed: true,
      }
    }
  }

  const { data: candidate, error: candError } = await supabase
    .from('candidates')
    .insert({
      intake_invite_id: invite.id,
      status: 'draft',
      email: invite.candidate_email,
    })
    .select('id, status, created_at')
    .single()

  if (candError) throw candError

  await supabase
    .from('intake_invites')
    .update({ candidate_id: candidate.id })
    .eq('id', invite.id)

  return {
    id: candidate.id,
    status: candidate.status,
    created_at: candidate.created_at,
    resumed: false,
  }
})
