import { loadResumeTextForSnapshotPropose } from '~/server/utils/resumeTextForCandidate'
import { assertAdminOwnsCandidate } from '~/server/utils/adminCandidateOwnership'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await assertAdminOwnsCandidate(user, id)

  const config = useRuntimeConfig()
  const aiProvider = resolveAiProviderName(config)
  if (!isAiProviderConfigured(aiProvider, config)) {
    throw createError({
      statusCode: 503,
      statusMessage: `${aiProviderDisplayName(aiProvider)} is not configured. Set ${aiProviderApiKeyName(aiProvider)} to regenerate Snapshot from resume.`,
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
    const proposals = await proposeProfessionalSnapshotWithAi(text)
    return {
      proposals,
      text_source: source,
      proposal_count: Object.keys(proposals).length,
      ai_provider: aiProvider,
    }
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: userFacingAiError(e, 'text', aiProvider),
    })
  }
})
