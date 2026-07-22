export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  const supabase = useSupabaseAdmin()

  const { data: candidate, error: loadError } = await supabase
    .from('candidates')
    .select('id, status, intake_invite_id, resume_storage_path')
    .eq('id', id)
    .maybeSingle()

  if (loadError) throw loadError
  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }
  if (candidate.status !== 'draft') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Only draft candidates can be deleted. Submitted packets stay in the list.',
    })
  }

  const inviteId = candidate.intake_invite_id as string
  const storagePath = typeof candidate.resume_storage_path === 'string'
    ? candidate.resume_storage_path.trim()
    : ''

  if (storagePath) {
    const { error: storageError } = await supabase.storage.from('resumes').remove([storagePath])
    if (storageError) {
      console.warn('[admin candidates delete] storage remove failed', storageError.message)
    }
  }

  // Break circular FK: invite.candidate_id ↔ candidates.intake_invite_id
  const { error: clearInviteError } = await supabase
    .from('intake_invites')
    .update({
      candidate_id: null,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', inviteId)

  if (clearInviteError) throw clearInviteError

  const { error: deleteCandidateError } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')

  if (deleteCandidateError) throw deleteCandidateError

  const { error: deleteInviteError } = await supabase
    .from('intake_invites')
    .delete()
    .eq('id', inviteId)

  if (deleteInviteError) {
    console.warn('[admin candidates delete] invite cleanup failed', deleteInviteError.message)
  }

  return { ok: true, id }
})
