import { randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await requireInviteForCandidate(event, id)
  const supabase = useSupabaseAdmin()

  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !candidate) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  if (candidate.status !== 'submitted' && candidate.status !== 'confirmed') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Candidate must be submitted first',
    })
  }

  if (!candidate.email) {
    throw createError({ statusCode: 400, statusMessage: 'Email required for confirmation' })
  }

  let accessToken = candidate.access_token
  if (!accessToken) {
    accessToken = randomBytes(24).toString('hex')
    await supabase
      .from('candidates')
      .update({ access_token: accessToken })
      .eq('id', id)
  }

  try {
    const emailResult = await sendConfirmationEmail({
      to: candidate.email,
      firstName: candidate.first_name,
      accessToken,
      submittedAt: candidate.updated_at,
    })

    if (emailResult.skipped) {
      return { sent: false, skipped: true as const }
    }
  } catch (e) {
    console.error('[send-confirmation]', e)
    return {
      sent: false,
      error: 'Failed to send email',
      access_token: accessToken,
    }
  }

  await supabase
    .from('candidates')
    .update({
      confirmation_sent_at: new Date().toISOString(),
      status: 'confirmed',
    })
    .eq('id', id)

  return { sent: true, email: candidate.email }
})
