import { z } from 'zod'

const adminCreateCandidateSchema = z.object({
  intake_invite_id: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const body = adminCreateCandidateSchema.parse(await readBody(event))
  const supabase = useSupabaseAdmin()

  const { data: invite, error: inviteError } = await supabase
    .from('intake_invites')
    .select('id, candidate_id, candidate_email, revoked_at, expires_at')
    .eq('id', body.intake_invite_id)
    .single()

  if (inviteError) throw inviteError
  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
  }
  if (invite.revoked_at) {
    throw createError({ statusCode: 403, statusMessage: 'Invite revoked' })
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw createError({ statusCode: 403, statusMessage: 'Invite expired' })
  }

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

  const { data: candidate, error: createError_ } = await supabase
    .from('candidates')
    .insert({
      intake_invite_id: invite.id,
      status: 'draft',
      email: invite.candidate_email,
    })
    .select('id, status, created_at')
    .single()

  if (createError_) throw createError_

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
