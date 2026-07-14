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

function traumaExperience(employers: EmployerEntry[]): string {
  const phrase = traumaLevelsPhrase(employers)
  if (!phrase) return ''
  return `Yes — ${phrase}`
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
    snapshot_trauma_experience: line(traumaExperience(employers)),
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

/** Labels matching the July 2026 contract wording (Title Case). */
export const PROFESSIONAL_SNAPSHOT_DOCX_LABELS: Record<ProfessionalSnapshotKey, string> = {
  snapshot_specialty: 'Specialty',
  snapshot_years_experience: 'Years of Experience',
  snapshot_travel_experience: 'Travel Experience',
  snapshot_trauma_experience: 'Trauma Experience',
  snapshot_teaching_facility_experience: 'Teaching Facility Experience',
  snapshot_magnet_facility_experience: 'Magnet Facility Experience',
  snapshot_charge_nurse_experience: 'Charge Nurse Experience',
  snapshot_preceptor_experience: 'Preceptor Experience',
  snapshot_float_experience: 'Float Experience',
  snapshot_emr_systems: 'EMR Systems',
  snapshot_patient_ratios_managed: 'Patient Ratios Managed',
  snapshot_equipment_skills: 'Equipment/Skills',
}

/**
 * Included snapshot rows only — drives `{#snapshot_lines}` so unchecked lines
 * never leave empty bullet paragraphs in Word.
 */
export function professionalSnapshotToLines(
  snapshot: ProfessionalSnapshot,
): Array<{ snapshot_line: string }> {
  const lines: Array<{ snapshot_line: string }> = []
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    const entry = snapshot[key]
    const value = entry?.included && entry.value.trim() ? entry.value.trim() : ''
    if (!value) continue
    lines.push({
      snapshot_line: `${PROFESSIONAL_SNAPSHOT_DOCX_LABELS[key]}: ${value}`,
    })
  }
  return lines
}

export const PROFESSIONAL_SNAPSHOT_LABELS: Record<ProfessionalSnapshotKey, string> = {
  snapshot_specialty: 'Specialty',
  snapshot_years_experience: 'Years of experience',
  snapshot_travel_experience: 'Travel experience',
  snapshot_trauma_experience: 'Trauma experience',
  snapshot_teaching_facility_experience: 'Teaching facility experience',
  snapshot_magnet_facility_experience: 'Magnet facility experience',
  snapshot_charge_nurse_experience: 'Charge nurse experience',
  snapshot_preceptor_experience: 'Preceptor experience',
  snapshot_float_experience: 'Float experience',
  snapshot_emr_systems: 'EMR systems',
  snapshot_patient_ratios_managed: 'Patient ratios managed',
  snapshot_equipment_skills: 'Equipment / skills',
}

/** Experience-presence lines edited as Yes/No + optional detail. */
export const SNAPSHOT_EXPERIENCE_FLAG_KEYS = [
  'snapshot_travel_experience',
  'snapshot_trauma_experience',
  'snapshot_teaching_facility_experience',
  'snapshot_magnet_facility_experience',
  'snapshot_charge_nurse_experience',
  'snapshot_preceptor_experience',
  'snapshot_float_experience',
] as const satisfies readonly ProfessionalSnapshotKey[]

export type SnapshotExperienceFlagKey = (typeof SNAPSHOT_EXPERIENCE_FLAG_KEYS)[number]

export type SnapshotExperienceAnswer = 'yes' | 'no' | ''

export function isSnapshotExperienceFlag(
  key: ProfessionalSnapshotKey,
): key is SnapshotExperienceFlagKey {
  return (SNAPSHOT_EXPERIENCE_FLAG_KEYS as readonly string[]).includes(key)
}

/**
 * Parse stored DOCX/wizard text into Yes/No + optional detail.
 * Legacy free text (e.g. "Level I") becomes Yes with that text as detail.
 */
export function parseExperienceFlagValue(raw: string | null | undefined): {
  answer: SnapshotExperienceAnswer
  detail: string
} {
  const value = (raw || '').trim()
  if (!value) return { answer: '', detail: '' }
  const match = /^(yes|no)\b(?:\s*[—–-]\s*(.*))?$/i.exec(value)
  if (match) {
    return {
      answer: match[1]!.toLowerCase() as 'yes' | 'no',
      detail: (match[2] || '').trim(),
    }
  }
  return { answer: 'yes', detail: value }
}

/** Format Yes/No + detail for storage / DOCX (`Yes — detail`). */
export function formatExperienceFlagValue(
  answer: SnapshotExperienceAnswer,
  detail: string | null | undefined,
): string {
  if (answer !== 'yes' && answer !== 'no') return ''
  if (answer === 'no') return 'No'
  const note = (detail || '').trim()
  return note ? `Yes — ${note}` : 'Yes'
}

/** Ensure all 12 lines exist for admin editor binding. */
export function ensureProfessionalSnapshotLines(
  snapshot: ProfessionalSnapshot | null | undefined,
): Record<ProfessionalSnapshotKey, ProfessionalSnapshotLine> {
  const normalized = normalizeProfessionalSnapshot(snapshot)
  const out = {} as Record<ProfessionalSnapshotKey, ProfessionalSnapshotLine>
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    out[key] = normalized[key]
      ? { ...normalized[key]! }
      : { value: '', included: false }
  }
  return out
}

function saysYes(value: string | undefined): boolean {
  return Boolean(value?.trim() && /^yes\b/i.test(value.trim()))
}

export interface SnapshotMismatch {
  key: ProfessionalSnapshotKey
  message: string
}

/** Soft warnings when included snapshot lines contradict wizard structured data. */
export function computeSnapshotMismatches(
  snapshot: ProfessionalSnapshot,
  candidate: SnapshotCandidateInput,
): SnapshotMismatch[] {
  const employers = candidate.employers || []
  const warnings: SnapshotMismatch[] = []
  const lines = ensureProfessionalSnapshotLines(snapshot)

  if (lines.snapshot_charge_nurse_experience.included && saysYes(lines.snapshot_charge_nurse_experience.value)) {
    if (!employers.some(e => e.chargeNurseExperience === true)) {
      warnings.push({
        key: 'snapshot_charge_nurse_experience',
        message: 'Snapshot says Yes, but no employer has charge nurse marked. Update Employment or edit this line.',
      })
    }
  }

  if (lines.snapshot_preceptor_experience.included && saysYes(lines.snapshot_preceptor_experience.value)) {
    if (!employers.some(e => e.preceptorExperience === true)) {
      warnings.push({
        key: 'snapshot_preceptor_experience',
        message: 'Snapshot says Yes, but no employer has preceptor marked. Update Employment or edit this line.',
      })
    }
  }

  if (
    lines.snapshot_teaching_facility_experience.included
    && saysYes(lines.snapshot_teaching_facility_experience.value)
  ) {
    if (!employers.some(e => e.teachingStatus === true)) {
      warnings.push({
        key: 'snapshot_teaching_facility_experience',
        message: 'Snapshot says Yes, but no employer is marked as a teaching facility.',
      })
    }
  }

  if (lines.snapshot_travel_experience.included && saysYes(lines.snapshot_travel_experience.value)) {
    if (!employers.some(e => normalizeEmploymentType(e.employmentType) === 'Travel')) {
      warnings.push({
        key: 'snapshot_travel_experience',
        message: 'Snapshot says Yes, but no employer has employment type Travel.',
      })
    }
  }

  const specialty = lines.snapshot_specialty.value.trim()
  if (lines.snapshot_specialty.included && specialty) {
    const specialties = (candidate.specialties || []).map(s => s.trim().toLowerCase())
    if (specialties.length && !specialties.includes(specialty.toLowerCase())) {
      warnings.push({
        key: 'snapshot_specialty',
        message: `Specialty “${specialty}” is not in the specialties list on Employment.`,
      })
    }
  }

  return warnings
}

/** Prefer stored snapshot when populated; otherwise derive for editing. */
export function resolveProfessionalSnapshotForEdit(
  candidate: SnapshotCandidateInput & {
    professional_snapshot?: ProfessionalSnapshot | null
  },
): ProfessionalSnapshot {
  return ensureProfessionalSnapshotLines(resolveProfessionalSnapshotForDocx(candidate))
}

export type SnapshotProposalLine = {
  value: string
  sourceSnippet?: string
  source?: string
}

export type SnapshotProposals = Partial<Record<ProfessionalSnapshotKey, SnapshotProposalLine>>

const SNAPSHOT_PROPOSAL_SNIPPET_MAX = 200

/**
 * Map Gemini propose JSON (`source_snippet`) onto SnapshotProposals.
 * Keeps known snapshot keys only.
 */
export function mapGeminiSnapshotProposals(
  raw: Partial<
    Record<ProfessionalSnapshotKey, { value?: string; source_snippet?: string }>
  >,
): SnapshotProposals {
  const out: SnapshotProposals = {}
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    const entry = raw[key]
    const value = entry?.value?.trim()
    if (!value) continue
    const snippet = entry?.source_snippet?.trim()
    out[key] = {
      value,
      source: 'gemini',
      ...(snippet
        ? { sourceSnippet: snippet.slice(0, SNAPSHOT_PROPOSAL_SNIPPET_MAX) }
        : {}),
    }
  }
  return out
}

/**
 * Merge AI proposals into the editor snapshot.
 * Never sets included: true — admin must re-approve each line.
 */
export function applySnapshotProposals(
  current: ProfessionalSnapshot | null | undefined,
  proposals: SnapshotProposals,
): ProfessionalSnapshot {
  const next = ensureProfessionalSnapshotLines(current)
  for (const key of PROFESSIONAL_SNAPSHOT_KEYS) {
    const proposal = proposals[key]
    const value = proposal?.value?.trim()
    if (!value) continue
    const sourceSnippet = proposal.sourceSnippet?.trim()
    next[key] = {
      value,
      included: false,
      source: proposal.source?.trim() || 'gemini',
      ...(sourceSnippet
        ? { sourceSnippet: sourceSnippet.slice(0, SNAPSHOT_PROPOSAL_SNIPPET_MAX) }
        : {}),
    }
  }
  return { ...next }
}

/** Apply one supplemental value onto a snapshot line (never auto-include). */
export function applySupplementalValueToSnapshot(
  current: ProfessionalSnapshot | null | undefined,
  key: ProfessionalSnapshotKey,
  value: string,
): ProfessionalSnapshot {
  const trimmed = value.trim()
  if (!trimmed) return ensureProfessionalSnapshotLines(current)
  return applySnapshotProposals(current, {
    [key]: { value: trimmed, source: 'supplemental' },
  })
}
