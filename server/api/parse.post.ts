const MAX_BYTES = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const filePart = form.find(p => p.name === 'file' && p.data)
  const candidateIdPart = form.find(p => p.name === 'candidateId')
  const candidateId = candidateIdPart?.data?.toString('utf8')

  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'File field required' })
  }

  const mime = filePart.type || 'application/octet-stream'
  if (!isAllowedResumeMime(mime)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Only PDF and DOCX files are supported',
    })
  }

  const buffer = Buffer.from(filePart.data)
  if (buffer.length > MAX_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: 'File must be 10MB or smaller',
    })
  }

  const token = getInviteTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Invite token required' })
  }

  const validation = await validateInviteToken(token)
  if (!validation.valid) {
    throw createError({ statusCode: 403, statusMessage: `Invite ${validation.reason}` })
  }

  const supabase = useSupabaseAdmin()
  let resolvedCandidateId = candidateId

  if (!resolvedCandidateId) {
    if (validation.invite.candidate_id) {
      resolvedCandidateId = validation.invite.candidate_id
    } else {
      const { data: created, error: createErr } = await supabase
        .from('candidates')
        .insert({
          intake_invite_id: validation.invite.id,
          status: 'draft',
          email: validation.invite.candidate_email,
        })
        .select('id')
        .single()
      if (createErr || !created) throw createErr
      resolvedCandidateId = created.id
      await supabase
        .from('intake_invites')
        .update({ candidate_id: created.id })
        .eq('id', validation.invite.id)
    }
  } else {
    await requireInviteForCandidate(event, resolvedCandidateId)
  }

  const storagePath = await uploadResumeFile(
    resolvedCandidateId,
    buffer,
    filePart.filename,
    mime,
  )

  let parseFailed = false
  let parseError: string | null = null
  let parsed: Awaited<ReturnType<typeof parseResumeWithGemini>> | null = null

  try {
    const rawText = await extractTextFromBuffer(buffer, mime, filePart.filename)
    if (!rawText) {
      throw new Error('No text extracted from document')
    }
    parsed = await parseResumeWithGemini(rawText)
  } catch (e) {
    parseFailed = true
    parseError = e instanceof Error ? e.message : 'Parse failed'
  }

  const updatePayload: Record<string, unknown> = {
    resume_storage_path: storagePath,
    resume_original_filename: filePart.filename,
    parse_error: parseError,
    parsed_resume: parsed ? { raw: parsed.rawText } : null,
  }

  if (parsed && !parseFailed) {
    Object.assign(updatePayload, {
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      license_number: parsed.licenseNumber,
      license_state: parsed.licenseState,
      specialties: parsed.specialties,
      employers: parsed.employers,
    })
  }

  await supabase
    .from('candidates')
    .update(updatePayload)
    .eq('id', resolvedCandidateId)

  return {
    candidateId: resolvedCandidateId,
    parse_failed: parseFailed,
    parse_error: parseError,
    first_name: parsed?.firstName,
    last_name: parsed?.lastName,
    email: parsed?.email,
    phone: parsed?.phone,
    license_number: parsed?.licenseNumber,
    license_state: parsed?.licenseState,
    specialties: parsed?.specialties,
    suggested_employers: parsed?.employers || [],
  }
})
