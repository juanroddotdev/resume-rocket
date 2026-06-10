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
].join(', ')

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('candidates')
    .select(ADMIN_CANDIDATE_SELECT)
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const { parsed_resume, ...candidate } = row as typeof row & { parsed_resume?: unknown }
    return {
      ...candidate,
      parse_outcome: parseOutcomeFromBlob(parsed_resume),
    }
  })
})
