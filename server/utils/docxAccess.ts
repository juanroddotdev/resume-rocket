import type { H3Event } from 'h3'
import { getHeader } from 'h3'

/** Authorize DOCX generation for a candidate row by id. */
export async function authorizeCandidateDocxAccess(event: H3Event, candidateId: string) {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      await requireAdminSession(event)
      return
    } catch {
      // Fall through to invite auth when bearer is missing or invalid.
    }
  }

  const intakeToken = getInviteTokenFromEvent(event)
  if (!intakeToken) {
    throw createError({ statusCode: 401, statusMessage: 'Invite token required' })
  }

  await requireInviteForCandidate(event, candidateId)
}
