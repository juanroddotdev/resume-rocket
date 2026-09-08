import { randomBytes } from 'node:crypto'
import { inviteCreateSchema } from '~/server/utils/schemas'
import { getAppSettings } from '~/server/utils/adminSettings'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  const body = inviteCreateSchema.parse(await readBody(event))
  const settings = await getAppSettings()
  const supabase = useSupabaseAdmin()

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(
    expiresAt.getDate() + (body.expires_in_days ?? settings.default_invite_expiration_days),
  )

  const namedLabel = [body.candidate_first_name, body.candidate_last_name].filter(Boolean).join(' ').trim()
  const label = body.label?.trim() || namedLabel || null

  const { data, error } = await supabase
    .from('intake_invites')
    .insert({
      token,
      label,
      candidate_email: body.candidate_email,
      candidate_first_name: body.candidate_first_name ?? null,
      candidate_last_name: body.candidate_last_name ?? null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, token, expires_at')
    .single()

  if (error) throw error

  const config = useRuntimeConfig()
  const url = `${config.public.siteUrl}/intake/${data.token}`

  return {
    id: data.id,
    token: data.token,
    url,
    expires_at: data.expires_at,
  }
})
