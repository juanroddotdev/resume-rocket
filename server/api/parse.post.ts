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

  const config = useRuntimeConfig()
  const rateLimit = checkParseRateLimit(token, {
    max: config.parseRateLimitMax,
    windowMs: config.parseRateLimitWindowMs,
  })
  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Too many upload attempts. Wait ${rateLimit.retryAfterSec} seconds and try again, or continue manually.`,
    })
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

  let parseError: string | null = null
  let geminiFailed = false
  let documentVision = false
  let parsed: Awaited<ReturnType<typeof parseResumeWithGemini>> | null = null
  let rawText = ''

  try {
    rawText = await extractTextFromBuffer(buffer, mime, filePart.filename)
    const geminiReady = isGeminiConfigured(config.geminiApiKey)

    if (needsDocumentVision(rawText, mime, filePart.filename)) {
      if (!geminiReady) {
        throw new Error(
          'This resume looks image-based. Add GEMINI_API_KEY for visual scanning, or continue manually.',
        )
      }
      documentVision = true
      parsed = await parseResumeWithGeminiDocument(buffer, mime)
      rawText = parsed.rawText || rawText
    }

    if (!rawText.trim() && !parsed) {
      throw new Error('No text extracted from document')
    }

    if (geminiReady && !documentVision) {
      try {
        parsed = await parseResumeWithGemini(rawText)
      } catch (e) {
        geminiFailed = true
        parseError = e instanceof Error ? e.message : 'AI parse failed'
      }
    }

    const heuristic = parseResumeHeuristically(rawText)
    parsed = mergeParsedResume(parsed, heuristic)
  } catch (e) {
    parseError = e instanceof Error ? e.message : 'Parse failed'
  }

  const hasFields = parsed ? hasParsedFields(parsed) : false
  const parseFailed = !hasFields

  const normalizedJsonb = normalizeCandidateJsonbFields({
    employers: parsed?.employers,
    credentials: credentialsInputFromParsed(parsed),
    education: parsed?.education,
  })

  const updatePayload: Record<string, unknown> = {
    resume_storage_path: storagePath,
    resume_original_filename: filePart.filename,
    parse_error: parseFailed ? parseError : geminiFailed ? parseError : null,
    parsed_resume: parsed ? { raw: parsed.rawText } : null,
  }

  if (parsed && hasFields) {
    Object.assign(updatePayload, {
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      license_number: parsed.licenseNumber,
      license_state: parsed.licenseState,
      specialties: parsed.specialties,
      years_nursing_experience: parsed.yearsNursingExperience,
      compact_license_status: parsed.compactLicenseStatus,
      average_patient_ratios: parsed.averagePatientRatios,
      specialized_medical_equipment: parsed.specializedMedicalEquipment,
      employers: normalizedJsonb.employers,
      ...(normalizedJsonb.education?.length ? { education: normalizedJsonb.education } : {}),
      ...(normalizedJsonb.credentials && Object.keys(normalizedJsonb.credentials).length
        ? { credentials: normalizedJsonb.credentials }
        : {}),
    })
  }

  await supabase
    .from('candidates')
    .update(updatePayload)
    .eq('id', resolvedCandidateId)

  const apiFields = parsedResumeToApiFields(parsed)
  const fieldsFound =
    countParsedFields(apiFields) + countDetectedCredentials(parsed?.detectedCredentials)

  const suggestedEmployers = apiFields.suggested_employers?.length
    ? await attachEmployerHospitalSuggestions(apiFields.suggested_employers)
    : []

  logParseOutcome({
    candidateId: resolvedCandidateId,
    mime,
    charCount: rawText.length,
    parseFailed,
    partialParse: geminiFailed && hasFields,
    documentScan: documentVision,
    geminiFailed,
    fieldsFound,
    parseErrorKind: classifyParseError(parseFailed || geminiFailed ? parseError : null),
  })

  return {
    candidateId: resolvedCandidateId,
    parse_failed: parseFailed,
    parse_error: parseFailed ? parseError : null,
    partial_parse: geminiFailed && hasFields,
    document_scan: documentVision,
    fields_found: fieldsFound,
    detected_credentials: parsed?.detectedCredentials || [],
    ...apiFields,
    suggested_employers: suggestedEmployers,
  }
})
