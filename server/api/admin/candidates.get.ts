import { parseOutcomeFromBlob } from '~/server/utils/parseAuditView'

const ADMIN_CANDIDATE_SELECT = [
  'id',
  'status',
  'first_name',
  'last_name',
  'email',
  'phone',
  'license_number',
  'license_state',
  'specialties',
  'credentials',
  'employers',
  'emr_system',
  'parse_error',
  'parsed_resume',
  'updated_at',
  'created_at',
  'intake_invite_id',
].join(', ')

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const config = useRuntimeConfig()
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('candidates')
    .select(ADMIN_CANDIDATE_SELECT)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const inviteIds = [...new Set((data ?? []).map(row => row.intake_invite_id).filter(Boolean))]
  const inviteUrlById = new Map<string, string>()

  if (inviteIds.length) {
    const { data: invites } = await supabase
      .from('intake_invites')
      .select('id, token')
      .in('id', inviteIds)

    for (const invite of invites ?? []) {
      inviteUrlById.set(invite.id, `${config.public.siteUrl}/intake/${invite.token}`)
    }
  }

  return (data ?? []).map((row) => {
    const { parsed_resume, intake_invite_id, ...candidate } = row as typeof row & {
      parsed_resume?: unknown
      intake_invite_id?: string
    }
    return {
      ...candidate,
      intake_invite_id,
      intake_url: intake_invite_id ? inviteUrlById.get(intake_invite_id) ?? null : null,
      parse_outcome: parseOutcomeFromBlob(parsed_resume),
    }
  })
})
