import { parseCandidateResumeFile } from '~/server/utils/parseCandidateResume'

const MAX_BYTES = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  const supabase = useSupabaseAdmin()
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('id, status')
    .eq('id', id)
    .single()

  if (candidateError) throw candidateError
  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }
  if (candidate.status === 'submitted' || candidate.status === 'confirmed') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Candidate already submitted',
    })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const filePart = form.find(p => p.name === 'file' && p.data)
  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File field required' })
  }

  const mime = filePart.type || 'application/octet-stream'
  const buffer = Buffer.from(filePart.data)
  if (buffer.length > MAX_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'File must be 10MB or smaller',
    })
  }

  return parseCandidateResumeFile({
    candidateId: id,
    buffer,
    filename: filePart.filename,
    mime,
    rateLimitKey: `admin:${user.id}`,
  })
})
