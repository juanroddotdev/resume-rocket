/** Field ids aligned with intake input `id` / gap-review targets. */
export function employerFacilityMetricsKey(index: number) {
  return `employer-${index}-facility-metrics`
}

type ParsePrefillInput = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  license_number?: string
  license_state?: string
  licenses?: Array<{
    state?: string
    number?: string
    expiry?: string
  }>
  specialties?: string[]
  years_nursing_experience?: string
  compact_license_status?: string
  average_patient_ratios?: string
  specialized_medical_equipment?: string
  education?: Array<{
    degree?: string
    school?: string
    graduationMonth?: string
    graduationYear?: string
  }>
  suggested_employers?: Array<{
    name?: string
    role?: string
    startDate?: string
    start_date?: string
    endDate?: string
    end_date?: string
    city?: string
    state?: string
    employmentType?: string
    employment_type?: string
    unitBedCount?: string
    unit_bed_count?: string
    patientScope?: string
    patient_scope?: string
    patientAcuity?: string
    patient_acuity?: string
    avgDailyPatients?: string
    avg_daily_patients?: string
    highlights?: string[]
  }>
  detected_credentials?: string[]
}

function pushFieldId(ids: string[], fieldId: string, value: unknown) {
  if (value === undefined || value === null) return
  if (typeof value === 'string' && !value.trim()) return
  if (Array.isArray(value) && value.length === 0) return
  ids.push(fieldId)
}

/** Map parse API payload keys to wizard field ids for subtle prefill highlighting. */
export function collectParsePrefillFieldIds(data: ParsePrefillInput): string[] {
  const ids: string[] = []

  pushFieldId(ids, 'first_name', data.first_name)
  pushFieldId(ids, 'last_name', data.last_name)
  pushFieldId(ids, 'email', data.email)
  pushFieldId(ids, 'phone', data.phone)
  pushFieldId(ids, 'license_number', data.license_number)
  pushFieldId(ids, 'license_state', data.license_state)
  data.licenses?.forEach((row, index) => {
    pushFieldId(ids, `license-${index}-state`, row.state)
    pushFieldId(ids, `license-${index}-number`, row.number)
    pushFieldId(ids, `license-${index}-expiry`, row.expiry)
  })
  pushFieldId(ids, 'specialties', data.specialties)
  pushFieldId(ids, 'years_nursing_experience', data.years_nursing_experience)
  pushFieldId(ids, 'compact_license_status', data.compact_license_status)
  pushFieldId(ids, 'average_patient_ratios', data.average_patient_ratios)
  pushFieldId(ids, 'specialized_medical_equipment', data.specialized_medical_equipment)

  data.education?.forEach((row, index) => {
    pushFieldId(ids, `education-${index}-degree`, row.degree)
    pushFieldId(ids, `education-${index}-school`, row.school)
    pushFieldId(ids, `education-${index}-month`, row.graduationMonth)
    pushFieldId(ids, `education-${index}-year`, row.graduationYear)
  })

  data.suggested_employers?.forEach((employer, index) => {
    collectEmployerPrefillIds(employer, index, ids)
  })

  for (const cert of data.detected_credentials || []) {
    const normalized = cert.trim().toUpperCase()
    if (normalized) ids.push(`credential-${normalized}`)
  }

  return ids
}

function employerField(
  employer: NonNullable<ParsePrefillInput['suggested_employers']>[number],
  camel: keyof NonNullable<ParsePrefillInput['suggested_employers']>[number],
  snake: string,
) {
  const record = employer as Record<string, unknown>
  const value = record[camel as string] ?? record[snake]
  return typeof value === 'string' ? value : undefined
}

function collectEmployerPrefillIds(
  employer: NonNullable<ParsePrefillInput['suggested_employers']>[number],
  index: number,
  ids: string[],
) {
  const prefix = `employer-${index}`
  pushFieldId(ids, `${prefix}-name`, employer.name)
  pushFieldId(ids, `${prefix}-role`, employer.role)
  pushFieldId(ids, `${prefix}-start`, employerField(employer, 'startDate', 'start_date'))
  pushFieldId(ids, `${prefix}-end`, employerField(employer, 'endDate', 'end_date'))
  pushFieldId(ids, `${prefix}-city`, employer.city)
  pushFieldId(ids, `${prefix}-state`, employer.state)
  pushFieldId(ids, `${prefix}-type`, employerField(employer, 'employmentType', 'employment_type'))
  pushFieldId(ids, `${prefix}-scope`, employerField(employer, 'patientScope', 'patient_scope'))
  pushFieldId(ids, `${prefix}-acuity`, employerField(employer, 'patientAcuity', 'patient_acuity'))
  pushFieldId(ids, `${prefix}-unit-beds`, employerField(employer, 'unitBedCount', 'unit_bed_count'))
  pushFieldId(ids, `${prefix}-avg-patients`, employerField(employer, 'avgDailyPatients', 'avg_daily_patients'))
  pushFieldId(ids, `${prefix}-highlights`, employer.highlights)
}

export function mergeFieldIdMaps(
  current: Record<string, true>,
  fieldIds: string[],
): Record<string, true> {
  if (!fieldIds.length) return current
  const next = { ...current }
  for (const fieldId of fieldIds) {
    next[fieldId] = true
  }
  return next
}
