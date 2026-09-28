import { parseOutcomeFromBlob } from '~/server/utils/parseAuditView'
import { listInviteIdsOwnedByAdmin } from '~/server/utils/adminCandidateOwnership'
import { getAppSettings, serializeAdminSettings } from '~/server/utils/adminSettings'

function startOfMonthIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  const settings = await getAppSettings()
  const ownedInviteIds = await listInviteIdsOwnedByAdmin(user.id)

  const usage = {
    parses_this_month: 0,
    parse_failed_this_month: 0,
    partial_parse_this_month: 0,
    document_scan_this_month: 0,
  }

  if (ownedInviteIds.length) {
    const supabase = useSupabaseAdmin()
    const { data, error } = await supabase
      .from('candidates')
      .select('parsed_resume')
      .in('intake_invite_id', ownedInviteIds)
      .not('parsed_resume', 'is', null)
      .gte('updated_at', startOfMonthIso())

    if (error) throw error

    for (const row of data ?? []) {
      const outcome = parseOutcomeFromBlob((row as { parsed_resume?: unknown }).parsed_resume)
      usage.parses_this_month++
      if (outcome?.parse_failed) usage.parse_failed_this_month++
      if (outcome?.partial_parse) usage.partial_parse_this_month++
      if (outcome?.document_scan) usage.document_scan_this_month++
    }
  }

  return {
    integrations: serializeAdminSettings(settings).integrations,
    usage,
  }
})
