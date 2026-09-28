import { parseCandidateResumeFile } from '~/server/utils/parseCandidateResume'
import { getAppSettings, uploadTooLargeMessage } from '~/server/utils/adminSettings'

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
  const settings = await getAppSettings()
  if (buffer.length > settings.max_upload_bytes) {
    throw createError({
      statusCode: 413,
      statusMessage: uploadTooLargeMessage(settings),
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
          email: validation.invite.candidate_email || null,
          first_name: validation.invite.candidate_first_name || null,
          last_name: validation.invite.candidate_last_name || null,
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
