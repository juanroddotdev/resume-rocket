import { parseCandidateResumeFile } from '~/server/utils/parseCandidateResume'

const MAX_BYTES = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const filePart = form.find(p => p.name === 'file' && p.data)
  const candidateIdPart = form.find(p => p.name === 'candidateId')
  const candidateId = candidateIdPart?.data?.toString('utf8')

  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File field required' })
  }

  const mime = filePart.type || 'application/octet-stream'
  const buffer = Buffer.from(filePart.data)
  if (buffer.length > MAX_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'File must be 10MB or smaller',
    })
  }

  const token = getInviteTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Invite token required' })
  }

  const validation = await validateInviteToken(token)
  if (!validation.valid) {
    throw createError({ statusCode: 403, statusMessage: `Invite ${validation.reason}` })
  }

  const supabase = useSupabaseAdmin()
  let resolvedCandidateId = candidateId

  if (!resolvedCandidateId) {
    if (validation.invite.candidate_id) {
      resolvedCandidateId = validation.invite.candidate_id
    } else {
      const { data: created, error: createErr } = await supabase
        .from('candidates')
        .insert({
          intake_invite_id: validation.invite.id,
          status: 'draft',
          email: validation.invite.candidate_email,
        })
        .select('id')
        .single()
      if (createErr || !created) throw createErr
      resolvedCandidateId = created.id
      await supabase
        .from('intake_invites')
        .update({ candidate_id: created.id })
        .eq('id', validation.invite.id)
    }
  } else {
    await requireInviteForCandidate(event, resolvedCandidateId)
  }

  return parseCandidateResumeFile({
    candidateId: resolvedCandidateId,
    buffer,
    filename: filePart.filename,
    mime,
    rateLimitKey: token,
  })
})
