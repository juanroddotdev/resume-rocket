import type { EmployerEntry } from '../types/candidate'
import { normalizeEmploymentType } from '../utils/employmentType.ts'
import { employerEmrProficienciesUnion } from '../utils/emrSystem.ts'
import { normalizeTraumaLevel } from '../utils/traumaLevel.ts'

/** The 12 contract `snapshot_*` DOCX tags. */
export const PROFESSIONAL_SNAPSHOT_KEYS = [
  'snapshot_specialty',
  'snapshot_years_experience',
  'snapshot_travel_experience',
  'snapshot_trauma_experience',
  'snapshot_teaching_facility_experience',
  'snapshot_magnet_facility_experience',
  'snapshot_charge_nurse_experience',
  'snapshot_preceptor_experience',
  'snapshot_float_experience',
  'snapshot_emr_systems',
  'snapshot_patient_ratios_managed',
  'snapshot_equipment_skills',
] as const

export type ProfessionalSnapshotKey = (typeof PROFESSIONAL_SNAPSHOT_KEYS)[number]

export interface ProfessionalSnapshotLine {
  value: string
  included: boolean
  source?: string
  sourceSnippet?: string
}

export type ProfessionalSnapshot = Partial<
  Record<ProfessionalSnapshotKey, ProfessionalSnapshotLine>
>

export interface SnapshotCandidateInput {
  specialties?: string[] | null
  years_nursing_experience?: string | null
  average_patient_ratios?: string | null
  specialized_medical_equipment?: string | null
  emr_system?: string | null
  employers?: EmployerEntry[] | null
}

function line(value: string, source = 'wizard'): ProfessionalSnapshotLine {
  const trimmed = value.trim()
  return {
    value: trimmed,
    included: trimmed.length > 0,
    source,
  }
}

function uniqueJoin(items: string[], sep = ', '): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    if (raw == null) continue
    const item = String(raw).trim()
    if (!item) continue
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out.join(sep)
}

function traumaLevelsPhrase(employers: EmployerEntry[]): string {
  const order = ['I', 'II', 'III', 'IV'] as const
  const found = new Set<string>()
  for (const e of employers) {
    const level = normalizeTraumaLevel(e.traumaLevel)
    if (level) found.add(level)
  }
  const ordered = order.filter(l => found.has(l))
  if (!ordered.length) return ''
  if (ordered.length === 1) return `Level ${ordered[0]}`
  return `Level ${ordered.join(' & ')}`
}

function travelExperience(employers: EmployerEntry[]): string {
  const travelCount = employers.filter(
    e => normalizeEmploymentType(e.employmentType) === 'Travel',
  ).length
  if (travelCount === 0) return ''
  if (travelCount === 1) return 'Yes — 1 travel contract'
  return `Yes — ${travelCount} travel contracts`
}

function anyYes(employers: EmployerEntry[], pick: (e: EmployerEntry) => boolean | undefined): string {
  if (employers.some(e => pick(e) === true)) return 'Yes'
  return ''
}

function floatExperience(employers: EmployerEntry[]): string {
  const units = employers.flatMap(e => e.floatedUnits || [])
  const joined = uniqueJoin(units)
  if (!joined) return ''
  return `Yes — ${joined}`
}

function equipmentSkills(
  specialized: string | null | undefined,
  employers: EmployerEntry[],
): string {
  const fromSpecialized = (specialized || '')
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean)
  const fromJobs = employers.flatMap(e => e.equipmentProcedures || [])
  return uniqueJoin([...fromSpecialized, ...fromJobs])
}

function patientRatios(
  average: string | null | undefined,
  employers: EmployerEntry[],
): string {
  const scopes = employers
    .map(e => e.avgDailyPatients?.trim() || e.patientScope?.trim() || '')
    .filter(Boolean)
  if (average?.trim()) {
    if (!scopes.length) return average.trim()
    return `${average.trim()}; ${uniqueJoin(scopes, '; ')}`
  }
  return uniqueJoin(scopes, '; ')
}

/** Derive Professional Snapshot defaults from wizard / parse fields (no Gemini). */
export function buildProfessionalSnapshotFromCandidate(
  candidate: SnapshotCandidateInput,
): ProfessionalSnapshot {
  const employers = candidate.employers || []
  const specialty = candidate.specialties?.[0]?.trim() || ''
  const years = candidate.years_nursing_experience?.trim() || ''
  const emr =
    employerEmrProficienciesUnion(employers) || candidate.emr_system?.trim() || ''

  return {
    snapshot_specialty: line(specialty),
    snapshot_years_experience: line(years),
    snapshot_travel_experience: line(travelExperience(employers)),
    snapshot_trauma_experience: line(traumaLevelsPhrase(employers)),
    snapshot_teaching_facility_experience: line(anyYes(employers, e => e.teachingStatus)),
    snapshot_magnet_facility_experience: line(''), // Phase 4 Gemini
    snapshot_charge_nurse_experience: line(
      anyYes(employers, e => e.chargeNurseExperience),
    ),
    snapshot_preceptor_experience: line(
      anyYes(employers, e => e.preceptorExperience),
    ),
    snapshot_float_experience: line(floatExperience(employers)),
    snapshot_emr_systems: line(emr),
    snapshot_patient_ratios_managed: line(
      patientRatios(candidate.average_patient_ratios, employers),
    ),
    snapshot_equipment_skills: line(
      equipmentSkills(candidate.specialized_medical_equipment, employers),
    ),
  }
}

export function normalizeProfessionalSnapshot(raw: unknown): ProfessionalSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const obj = raw as Record<string, unknown>
  const out: ProfessionalSnapshot = {}

  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    const entry = obj[key]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const row = entry as Record<string, unknown>
    const value = typeof row.value === 'string' ? row.value.trim() : ''
    const included =
      typeof row.included === 'boolean' ? row.included : value.length > 0
    const lineOut: ProfessionalSnapshotLine = { value, included }
    if (typeof row.source === 'string' && row.source.trim()) {
      lineOut.source = row.source.trim()
    }
    if (typeof row.sourceSnippet === 'string' && row.sourceSnippet.trim()) {
      lineOut.sourceSnippet = row.sourceSnippet.trim()
    }
    out[key] = lineOut
  }

  return out
}

export function professionalSnapshotHasValues(snapshot: ProfessionalSnapshot | null | undefined): boolean {
  if (!snapshot) return false
  return PROFESSIONAL_SNAPSHOT_KEYS.some(key => {
    const line = snapshot[key]
    return Boolean(line?.value?.trim())
  })
}

/** Resolve snapshot for DOCX: use stored when present, else derive from candidate. */
export function resolveProfessionalSnapshotForDocx(
  candidate: SnapshotCandidateInput & {
    professional_snapshot?: ProfessionalSnapshot | null
  },
): ProfessionalSnapshot {
  const stored = normalizeProfessionalSnapshot(candidate.professional_snapshot)
  if (professionalSnapshotHasValues(stored)) return stored
  return buildProfessionalSnapshotFromCandidate(candidate)
}

/** Flatten to template keys — empty string when not included. */
export function professionalSnapshotToTemplateData(
  snapshot: ProfessionalSnapshot,
): Record<ProfessionalSnapshotKey, string> {
  const out = {} as Record<ProfessionalSnapshotKey, string>
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    const entry = snapshot[key]
    out[key] = entry?.included && entry.value.trim() ? entry.value.trim() : ''
  }
  return out
}
