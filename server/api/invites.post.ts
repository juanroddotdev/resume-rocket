import { randomBytes } from 'node:crypto'
import { inviteCreateSchema } from '~/server/utils/schemas'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  const body = inviteCreateSchema.parse(await readBody(event))
  const supabase = useSupabaseAdmin()

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + body.expires_in_days)

  const { data, error } = await supabase
    .from('intake_invites')
    .insert({
      token,
      label: body.label,
      candidate_email: body.candidate_email,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token, expires_at')
    .single()

  if (error) throw error

  const config = useRuntimeConfig()
  const url = `${config.public.siteUrl}/intake/${data.token}`

  return {
    token: data.token,
    url,
    expires_at: data.expires_at,
  }
})
