import { buildParseAuditView } from '~/server/utils/parseAuditView'
import { assertAdminOwnsCandidate } from '~/server/utils/adminCandidateOwnership'
import { isPlatformAdmin } from '~/server/utils/platformAdmin'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  if (!isPlatformAdmin(user)) {
    throw createError({ statusCode: 403, statusMessage: 'Parse QA is restricted to platform admins' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await assertAdminOwnsCandidate(user, id)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, parse_error, parsed_resume, employers, licenses, education, credentials, license_state, license_number')
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
    wizardLicenses: data.licenses,
    wizardEducation: data.education,
    wizardCredentials: data.credentials,
    licenseState: data.license_state,
    licenseNumber: data.license_number,
  })
})
