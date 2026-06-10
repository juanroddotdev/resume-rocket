import type { ParseAudit, ParseOutcome, ParsedResume } from '~/types/parse'

const MAX_BYTES = 10 * 1024 * 1024

function buildParsedResumeBlob(
  rawText: string | undefined,
  audit: ParseAudit | null,
  outcome: ParseOutcome,
) {
  return {
    ...(rawText ? { raw: rawText } : {}),
    ...(audit ? { audit } : {}),
    outcome,
  }
}

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
  let documentVisionAttempted = false
  let parsed: ParsedResume | null = null
  let parseAudit: ParseAudit | null = null
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
      documentVisionAttempted = true
      documentVision = true
      try {
        const docResult = await parseResumeWithGeminiDocument(buffer, mime)
        parsed = docResult.resume
        parseAudit = docResult.audit
        rawText = docResult.resume.rawText || rawText
      } catch (e) {
        geminiFailed = true
        documentVision = false
        parseError = userFacingGeminiError(e, 'vision')
      }
    }

    if (!rawText.trim() && !parsed) {
      throw new Error(parseError || 'No text extracted from document')
    }

    if (geminiReady && !documentVisionAttempted) {
      try {
        const textResult = await parseResumeWithGemini(rawText)
        parsed = textResult.resume
        parseAudit = textResult.audit
      } catch (e) {
        geminiFailed = true
        parseError = userFacingGeminiError(e, 'text')
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

  const apiFields = parsedResumeToApiFields(parsed)
  const fieldsFound =
    countParsedFields(apiFields) + countDetectedCredentials(parsed?.detectedCredentials)

  const parseOutcome: ParseOutcome = {
    fields_found: fieldsFound,
    partial_parse: geminiFailed && hasFields,
    document_scan: documentVision,
    gemini_failed: geminiFailed,
    parse_failed: parseFailed,
  }

  const updatePayload: Record<string, unknown> = {
    resume_storage_path: storagePath,
    resume_original_filename: filePart.filename,
    parse_error: parseFailed ? parseError : geminiFailed ? parseError : null,
    parsed_resume: buildParsedResumeBlob(parsed?.rawText, parseAudit, parseOutcome),
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

  const suggestedEmployers = apiFields.suggested_employers?.length
    ? await attachEmployerHospitalSuggestions(apiFields.suggested_employers)
    : []

  logParseOutcome({
    candidateId: resolvedCandidateId,
    mime,
    charCount: rawText.length,
    parseFailed,
    partialParse: parseOutcome.partial_parse,
    documentScan: parseOutcome.document_scan,
    geminiFailed,
    fieldsFound,
    parseErrorKind: classifyParseError(parseFailed || geminiFailed ? parseError : null),
  })

  return {
    candidateId: resolvedCandidateId,
    parse_failed: parseFailed,
    parse_error: parseFailed ? parseError : null,
    partial_parse: parseOutcome.partial_parse,
    document_scan: parseOutcome.document_scan,
    fields_found: fieldsFound,
    detected_credentials: parsed?.detectedCredentials || [],
    ...apiFields,
    suggested_employers: suggestedEmployers,
  }
})
