import { candidatePatchSchema } from '~/server/utils/schemas'
import { patchCandidateRow } from '~/server/utils/patchCandidateRow'
import { assertAdminOwnsCandidate } from '~/server/utils/adminCandidateOwnership'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await assertAdminOwnsCandidate(user.id, id)

  const body = candidatePatchSchema.parse(await readBody(event))
  return patchCandidateRow(id, body)
})
