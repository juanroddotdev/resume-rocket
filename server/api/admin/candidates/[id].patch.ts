import { candidatePatchSchema } from '~/server/utils/schemas'
import { patchCandidateRow } from '~/server/utils/patchCandidateRow'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  const body = candidatePatchSchema.parse(await readBody(event))
  return patchCandidateRow(id, body)
})
