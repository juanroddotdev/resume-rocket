import { parseOutcomeFromBlob } from '~/server/utils/parseAuditView'
import { listInviteIdsOwnedByAdmin } from '~/server/utils/adminCandidateOwnership'
import { isPlatformAdmin } from '~/server/utils/platformAdmin'

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
  const user = await requireAdminSession(event)
  const canShowAllCandidates = isPlatformAdmin(user)

  const query = getQuery(event)
  const showAll = query.scope === 'all' && canShowAllCandidates

  const config = useRuntimeConfig()
  const supabase = useSupabaseAdmin()

  let queryBuilder = supabase
    .from('candidates')
    .select(ADMIN_CANDIDATE_SELECT)
    .order('updated_at', { ascending: false })

  if (!showAll) {
    const ownedInviteIds = await listInviteIdsOwnedByAdmin(user.id)
    if (!ownedInviteIds.length) {
      return { candidates: [], canShowAllCandidates }
    }
    queryBuilder = queryBuilder.in('intake_invite_id', ownedInviteIds)
  }

  const { data, error } = await queryBuilder

  if (error) throw error

  const rowInviteIds = [...new Set((data ?? []).map(row => row.intake_invite_id).filter(Boolean))]
  const inviteUrlById = new Map<string, string>()

  if (rowInviteIds.length) {
    const { data: invites } = await supabase
      .from('intake_invites')
      .select('id, token')
      .in('id', rowInviteIds)

    for (const invite of invites ?? []) {
      inviteUrlById.set(invite.id, `${config.public.siteUrl}/intake/${invite.token}`)
    }
  }

  const candidates = (data ?? []).map((row) => {
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

  return { candidates, canShowAllCandidates }
})
