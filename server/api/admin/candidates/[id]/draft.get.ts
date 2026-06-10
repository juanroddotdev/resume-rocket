import { buildCandidateDraftResponse, CANDIDATE_DRAFT_SELECT } from '~/server/utils/candidateDraftResponse'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('candidates')
    .select(CANDIDATE_DRAFT_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  return buildCandidateDraftResponse(data as Record<string, unknown>)
})
