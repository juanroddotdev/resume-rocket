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
    candidate = data
  } else if (body.access_token) {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('access_token', body.access_token)
      .single()
    if (error || !data) {
      throw createError({ statusCode: 404, statusMessage: 'Invalid access token' })
    }
    candidate = data
  } else {
    throw createError({ statusCode: 400, statusMessage: 'id or access_token required' })
  }

  const employers = (candidate.employers as Array<Record<string, unknown>> | null)?.map(e => ({
    name: String(e.name || ''),
    role: e.role ? String(e.role) : undefined,
    beds: e.beds as number | undefined,
    trauma_level: (e.trauma_level || e.traumaLevel) as string | undefined,
  }))

  const buffer = await buildResumeDocx({
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email,
    phone: candidate.phone,
    license_number: candidate.license_number,
    emr_system: candidate.emr_system,
    employers,
    credentials: candidate.credentials as Record<string, boolean> | null,
  })

  const filename = `resume-${candidate.last_name || 'candidate'}.docx`.replace(/\s+/g, '-')

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return buffer
})
