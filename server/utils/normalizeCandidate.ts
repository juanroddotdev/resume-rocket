import type { CredentialEntry, CredentialsMap, EducationEntry, EmployerEntry } from '../../types/candidate'

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined
  const s = String(value).trim()
  return s || undefined
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function optionalBool(value: unknown): boolean | undefined {
  if (value === true || value === false) return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return undefined
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map(item => String(item).trim()).filter(Boolean)
  return items.length ? items : undefined
}

/** Canonical employer shape (camelCase). Accepts legacy snake_case keys on input. */
export function normalizeEmployer(raw: unknown): EmployerEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const name = optionalString(e.name)
  if (!name) return null

  const entry: EmployerEntry = { name }
  const role = optionalString(e.role)
  const startDate = optionalString(e.startDate ?? e.start_date)
  const endDate = optionalString(e.endDate ?? e.end_date)
  const city = optionalString(e.city)
  const state = optionalString(e.state)
  const hospitalId = optionalString(e.hospitalId ?? e.hospital_id)
  const beds = optionalNumber(e.beds)
  const traumaLevel = optionalString(e.traumaLevel ?? e.trauma_level)
  const teachingStatus = optionalBool(e.teachingStatus ?? e.teaching_status)
  const employmentType = optionalString(e.employmentType ?? e.employment_type)
  const unitBedCount = optionalString(e.unitBedCount ?? e.unit_bed_count)
  const patientScope = optionalString(e.patientScope ?? e.patient_scope)
  const floatedUnits = optionalStringArray(e.floatedUnits ?? e.floated_units)
  const equipmentProcedures = optionalStringArray(
    e.equipmentProcedures ?? e.equipment_procedures,
  )
  const avgDailyPatients = optionalString(
    e.avgDailyPatients ?? e.avg_daily_patients ?? e.average_daily_patients,
  )
  const patientAcuity = optionalString(e.patientAcuity ?? e.patient_acuity)
  const highlights = optionalStringArray(e.highlights)

  if (role) entry.role = role
  if (startDate) entry.startDate = startDate
  if (endDate) entry.endDate = endDate
  if (city) entry.city = city
  if (state) entry.state = state
  if (hospitalId) entry.hospitalId = hospitalId
  if (beds != null) entry.beds = beds
  if (traumaLevel) entry.traumaLevel = traumaLevel
  if (teachingStatus != null) entry.teachingStatus = teachingStatus
  if (employmentType) entry.employmentType = employmentType
  if (unitBedCount) entry.unitBedCount = unitBedCount
  if (patientScope) entry.patientScope = patientScope
  if (floatedUnits) entry.floatedUnits = floatedUnits
  if (equipmentProcedures) entry.equipmentProcedures = equipmentProcedures
  if (avgDailyPatients) entry.avgDailyPatients = avgDailyPatients
  if (patientAcuity) entry.patientAcuity = patientAcuity
  if (highlights) entry.highlights = highlights

  return entry
}

export function normalizeEmployers(raw: unknown): EmployerEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeEmployer).filter((e): e is EmployerEntry => e !== null)
}

/** Accepts `{ BLS: true }` or `{ BLS: { active, expiry? } }`; stores canonical CredentialEntry map. */
export function normalizeCredentialValue(raw: unknown): CredentialEntry | null {
  if (raw === true) return { active: true }
  if (raw === false || raw == null) return null
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const active = optionalBool(o.active ?? o.enabled) ?? false
    const expiry = optionalString(o.expiry ?? o.expiration ?? o.expirationDate)
    if (!active && !expiry) return null
    return expiry ? { active, expiry } : { active }
  }
  return null
}

export function normalizeCredentials(raw: unknown): CredentialsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: CredentialsMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const certKey = key.trim().toUpperCase()
    if (!certKey) continue
    const normalized = normalizeCredentialValue(value)
    if (normalized) out[certKey] = normalized
  }
  return out
}

export function normalizeEducation(raw: unknown): EducationEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const degree = optionalString(o.degree ?? o.education_degree)
      const school = optionalString(o.school ?? o.schoolName ?? o.education_school_name)
      const graduationYear = optionalString(
        o.graduationYear ?? o.graduation_year ?? o.education_graduation_year,
      )
      if (!degree && !school && !graduationYear) return null
      const entry: EducationEntry = {}
      if (degree) entry.degree = degree
      if (school) entry.school = school
      if (graduationYear) entry.graduationYear = graduationYear
      return entry
    })
    .filter((e): e is EducationEntry => e !== null)
}

export function isCredentialActive(
  credentials: CredentialsMap | Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  if (!credentials) return false
  const entry = credentials[key]
  if (entry === true) return true
  if (entry === false || entry == null) return false
  if (typeof entry === 'object') {
    return (entry as CredentialEntry).active === true
  }
  return false
}

export function credentialExpiryDisplay(
  credentials: CredentialsMap | Record<string, unknown> | null | undefined,
  key: string,
): string {
  if (!credentials) return ''
  const entry = credentials[key]
  if (typeof entry === 'object' && entry !== null && 'expiry' in entry) {
    const expiry = (entry as CredentialEntry).expiry
    if (expiry) return expiry
  }
  return isCredentialActive(credentials, key) ? 'Current' : ''
}

export function activeCredentialKeys(
  credentials: CredentialsMap | Record<string, unknown> | null | undefined,
): string[] {
  if (!credentials) return []
  return Object.keys(credentials).filter(key => isCredentialActive(credentials, key))
}

export function normalizeCandidateJsonbFields(fields: {
  employers?: unknown
  credentials?: unknown
  education?: unknown
}) {
  const out: {
    employers?: EmployerEntry[]
    credentials?: CredentialsMap
    education?: EducationEntry[]
  } = {}

  if (fields.employers !== undefined) out.employers = normalizeEmployers(fields.employers)
  if (fields.credentials !== undefined) out.credentials = normalizeCredentials(fields.credentials)
  if (fields.education !== undefined) out.education = normalizeEducation(fields.education)

  return out
}

/** Normalize JSONB columns when reading a candidate row for export or server use. */
export function normalizeCandidateRow<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    employers: normalizeEmployers(row.employers),
    credentials: normalizeCredentials(row.credentials),
    education: normalizeEducation(row.education),
  }
}
