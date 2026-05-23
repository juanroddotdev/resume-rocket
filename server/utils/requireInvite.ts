import type { H3Event } from 'h3'

const COOKIE_NAME = 'intake_token'

export function getInviteTokenFromEvent(event: H3Event): string | null {
  const header = getHeader(event, 'x-intake-token')
  if (header) return header
  return getCookie(event, COOKIE_NAME) || null
}

export function setInviteCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function validateInviteToken(token: string) {
  const supabase = useSupabaseAdmin()
  const { data: invite, error } = await supabase
    .from('intake_invites')
    .select('id, token, expires_at, revoked_at, used_at, candidate_id, candidate_email')
    .eq('token', token)
    .maybeSingle()

  if (error) throw error
  if (!invite) return { valid: false as const, reason: 'invalid' as const }
  if (invite.revoked_at) return { valid: false as const, reason: 'revoked' as const }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false as const, reason: 'expired' as const }
  }

  if (invite.candidate_id) {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('status')
      .eq('id', invite.candidate_id)
      .maybeSingle()
    if (candidate?.status === 'submitted' || candidate?.status === 'confirmed') {
      return { valid: false as const, reason: 'completed' as const, invite }
    }
  }

  return { valid: true as const, invite }
}

export async function requireInviteForCandidate(
  event: H3Event,
  candidateId: string,
) {
  const token = getInviteTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Invite token required' })
  }

  const result = await validateInviteToken(token)
  if (!result.valid) {
    throw createError({ statusCode: 403, statusMessage: `Invite ${result.reason}` })
  }

  const supabase = useSupabaseAdmin()
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('id, intake_invite_id, status')
    .eq('id', candidateId)
    .maybeSingle()

  if (error) throw error
  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  if (candidate.intake_invite_id !== result.invite.id) {
    throw createError({ statusCode: 403, statusMessage: 'Invite does not match candidate' })
  }

  return { invite: result.invite, candidate, token }
}
