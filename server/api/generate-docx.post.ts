import {
  buildResumeDownloadFilename,
  contentDispositionAttachment,
} from '../../utils/resumeDownloadFilename'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: string; access_token?: string }>(event)
  const supabase = useSupabaseAdmin()

  let candidate
  if (body.id) {
    const intakeToken = getInviteTokenFromEvent(event)
    if (intakeToken) {
      await requireInviteForCandidate(event, body.id)
    } else {
      await requireAdminSession(event)
    }
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', body.id)
      .single()
    if (error || !data) {
      throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
    }
    candidate = normalizeCandidateRow(data as Record<string, unknown>)
  } else if (body.access_token) {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('access_token', body.access_token)
      .single()
    if (error || !data) {
      throw createError({ statusCode: 404, statusMessage: 'Invalid access token' })
    }
    candidate = normalizeCandidateRow(data as Record<string, unknown>)
  } else {
    throw createError({ statusCode: 400, statusMessage: 'id or access_token required' })
  }

  const buffer = await buildResumeDocx({
    first_name: candidate.first_name as string | null,
    last_name: candidate.last_name as string | null,
    email: candidate.email as string | null,
    phone: candidate.phone as string | null,
    license_number: candidate.license_number as string | null,
    license_state: candidate.license_state as string | null,
    emr_system: candidate.emr_system as string | null,
    specialties: candidate.specialties as string[] | null,
    employers: candidate.employers,
    credentials: candidate.credentials,
    education: candidate.education,
    years_nursing_experience: candidate.years_nursing_experience as string | null,
    compact_license_status: candidate.compact_license_status as string | null,
    average_patient_ratios: candidate.average_patient_ratios as string | null,
    specialized_medical_equipment: candidate.specialized_medical_equipment as string | null,
  })

  const filename = buildResumeDownloadFilename({
    firstName: candidate.first_name as string | null,
    lastName: candidate.last_name as string | null,
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  setHeader(event, 'Content-Disposition', contentDispositionAttachment(filename))

  return buffer
})
