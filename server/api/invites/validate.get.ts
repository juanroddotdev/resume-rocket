export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = String(query.token || '')

  if (!token) {
    return { valid: false, reason: 'missing' }
  }

  const result = await validateInviteToken(token)

  if (!result.valid) {
    return {
      valid: false,
      reason: result.reason,
      candidate_email: 'invite' in result ? result.invite?.candidate_email : undefined,
      candidate_first_name: 'invite' in result ? result.invite?.candidate_first_name : undefined,
      candidate_last_name: 'invite' in result ? result.invite?.candidate_last_name : undefined,
    }
  }

  setInviteCookie(event, token)

  return {
    valid: true,
    invite_id: result.invite.id,
    candidate_id: result.invite.candidate_id,
    candidate_email: result.invite.candidate_email,
    candidate_first_name: result.invite.candidate_first_name,
    candidate_last_name: result.invite.candidate_last_name,
    expires_at: result.invite.expires_at,
  }
})
