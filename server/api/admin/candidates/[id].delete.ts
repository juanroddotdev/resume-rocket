import { assertAdminOwnsCandidate } from '~/server/utils/adminCandidateOwnership'

function throwDbError(error: { message?: string; code?: string }, fallback: string): never {
  throw createError({
    statusCode: 500,
    statusMessage: error.message || fallback,
    data: { code: error.code },
  })
}

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await assertAdminOwnsCandidate(user, id)

  const supabase = useSupabaseAdmin()

  const { data: candidate, error: loadError } = await supabase
    .from('candidates')
    .select('id, status, intake_invite_id, resume_storage_path')
    .eq('id', id)
    .maybeSingle()

  if (loadError) throwDbError(loadError, 'Could not load candidate')
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

  // Break circular FK: invite.candidate_id ↔ candidates.intake_invite_id
  const revokedAt = new Date().toISOString()
  const { error: clearLinkedInviteError } = await supabase
    .from('intake_invites')
    .update({ candidate_id: null, revoked_at: revokedAt })
    .eq('id', inviteId)

  if (clearLinkedInviteError) throwDbError(clearLinkedInviteError, 'Could not revoke candidate link')

  // Also clear any other invite rows still pointing at this candidate.
  const { error: clearRefsError } = await supabase
    .from('intake_invites')
    .update({ candidate_id: null })
    .eq('candidate_id', id)

  if (clearRefsError) throwDbError(clearRefsError, 'Could not clear invite references')

  const { error: deleteCandidateError } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')

  if (deleteCandidateError) throwDbError(deleteCandidateError, 'Could not delete draft')

  const { error: deleteInviteError } = await supabase
    .from('intake_invites')
    .delete()
    .eq('id', inviteId)

  if (deleteInviteError) {
    console.warn('[admin candidates delete] invite cleanup failed', deleteInviteError.message)
  }

  // Storage cleanup is best-effort and must not block / drop the HTTP response.
  if (storagePath) {
    void supabase.storage.from('resumes').remove([storagePath]).then(({ error: storageError }) => {
      if (storageError) {
        console.warn('[admin candidates delete] storage remove failed', storageError.message)
      }
    })
  }

  return { ok: true, id }
})
