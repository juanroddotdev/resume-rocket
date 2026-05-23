export function useIntakeInvite() {
  const token = useState<string | null>('intake-token', () => null)
  const inviteValid = useState<boolean>('invite-valid', () => false)
  const inviteError = useState<string | null>('invite-error', () => null)
  const candidateId = useState<string | null>('invite-candidate-id', () => null)
  const prefilledEmail = useState<string | null>('invite-email', () => null)

  async function validate(routeToken: string) {
    token.value = routeToken
    inviteError.value = null

    const result = await $fetch<{
      valid: boolean
      reason?: string
      candidate_id?: string
      candidate_email?: string
    }>('/api/invites/validate', { query: { token: routeToken } })

    if (!result.valid) {
      inviteValid.value = false
      inviteError.value = result.reason || 'invalid'
      return false
    }

    inviteValid.value = true
    candidateId.value = result.candidate_id || null
    prefilledEmail.value = result.candidate_email || null
    return true
  }

  function intakeHeaders(): Record<string, string> {
    return token.value ? { 'x-intake-token': token.value } : {}
  }

  return {
    token,
    inviteValid,
    inviteError,
    candidateId,
    prefilledEmail,
    validate,
    intakeHeaders,
  }
}
