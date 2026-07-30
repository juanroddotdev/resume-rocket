/** Admin candidate access is scoped to invites where `created_by` is the logged-in user. */

export async function listInviteIdsOwnedByAdmin(userId: string): Promise<string[]> {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('intake_invites')
    .select('id')
    .eq('created_by', userId)

  if (error) throw error
  return (data ?? []).map(row => row.id as string)
}

export async function assertAdminOwnsInvite(userId: string, inviteId: string) {
  const supabase = useSupabaseAdmin()
  const { data: invite, error } = await supabase
    .from('intake_invites')
    .select('id, created_by')
    .eq('id', inviteId)
    .maybeSingle()

  if (error) throw error
  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }
  if (invite.created_by !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have access to this invite' })
  }
}

export async function assertAdminOwnsCandidate(userId: string, candidateId: string) {
  const supabase = useSupabaseAdmin()
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('id, intake_invite_id')
    .eq('id', candidateId)
    .maybeSingle()

  if (error) throw error
  if (!candidate?.intake_invite_id) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  await assertAdminOwnsInvite(userId, candidate.intake_invite_id as string)
}
