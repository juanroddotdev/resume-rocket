import { buildParseAuditView } from '~/server/utils/parseAuditView'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.enableParseAuditUi) {
    throw createError({ statusCode: 404, statusMessage: 'Parse audit UI is disabled' })
  }

  await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, parse_error, parsed_resume, employers')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  return buildParseAuditView({
    candidateId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    parseError: data.parse_error,
    parsedResume: data.parsed_resume,
    wizardEmployers: data.employers,
  })
})
