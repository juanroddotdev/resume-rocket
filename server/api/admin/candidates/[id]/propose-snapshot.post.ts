import { isGeminiConfigured } from '~/server/utils/geminiShared'
import { proposeProfessionalSnapshotWithGemini } from '~/server/utils/geminiSnapshotPropose'
import { loadResumeTextForSnapshotPropose } from '~/server/utils/resumeTextForCandidate'
import { userFacingGeminiError } from '~/server/utils/geminiErrors'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  const config = useRuntimeConfig()
  if (!isGeminiConfigured(config.geminiApiKey)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Gemini is not configured. Set GEMINI_API_KEY to regenerate Snapshot from resume.',
    })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('candidates')
    .select('id, parsed_resume, resume_storage_path')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  const { text, source } = await loadResumeTextForSnapshotPropose({
    parsed_resume: data.parsed_resume,
    resume_storage_path: data.resume_storage_path,
  })

  try {
    const proposals = await proposeProfessionalSnapshotWithGemini(text)
    return {
      proposals,
      text_source: source,
      proposal_count: Object.keys(proposals).length,
    }
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: userFacingGeminiError(e, 'text'),
    })
  }
})
