import type {
  EmployerEntry,
  CandidateDraftInput,
  EducationEntry,
  CredentialsMap,
  CredentialEntry,
  CandidateStatus,
} from '~/types/candidate'
import type { HospitalSuggestion } from '~/types/hospital'
import { employersForPatch, mapParsedEmployers } from '~/utils/employerLink'
import type { FinalizePhase } from '~/utils/intakeProcessing'
import type { PrefillHighlightSnapshot } from '~/composables/useIntakePrefillHighlight'
import type { ParseMeta } from '~/types/parse'
import { displayCredentialExpiry } from '~/utils/credentialExpiry'
import { backfillEmployerEmrSystems, employerEmrProficienciesUnion } from '~/utils/emrSystem'

const LEGACY_STORAGE_KEY = 'resume-rocket-draft'
const CERT_KEYS = ['BLS', 'ACLS', 'PALS', 'NIHSS', 'TNCC', 'CCRN'] as const

export type ServerDraftResponse = {
  id: string
  status: CandidateStatus
  updated_at?: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  license_number?: string | null
  license_state?: string | null
  emr_system?: string | null
  specialties?: string[] | null
  credentials?: CredentialsMap | null
  employers?: EmployerEntry[] | null
  education?: EducationEntry[] | null
  years_nursing_experience?: string | null
  compact_license_status?: string | null
  average_patient_ratios?: string | null
  specialized_medical_equipment?: string | null
}

function normalizeStoredCredentials(raw: unknown): CredentialsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: CredentialsMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) {
      out[key.toUpperCase()] = { active: true }
    } else if (value && typeof value === 'object' && 'active' in (value as CredentialEntry)) {
      const entry = value as CredentialEntry
      out[key.toUpperCase()] = entry.active || entry.expiry
        ? { active: entry.active ?? true, expiry: displayCredentialExpiry(entry.expiry) || undefined }
        : { active: true }
    }
  }
  return out
}

function defaultForm() {
  return {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    license_state: '',
    emr_system: '',
    employers: [] as EmployerEntry[],
    credentials: {} as CredentialsMap,
    specialties: [] as string[],
    years_nursing_experience: '',
    compact_license_status: '',
    average_patient_ratios: '',
    specialized_medical_equipment: '',
    education: [] as EducationEntry[],
  }
}

function storageKey(token: string) {
  return `resume-rocket-draft:${token}`
}

function stripEmployerSuggestions(employers: EmployerEntry[]): EmployerEntry[] {
  return employers.map(({ hospitalSuggestions: _s, ...rest }) => rest)
}

function formSnapshot(form: ReturnType<typeof defaultForm>): CandidateDraftInput {
  const employers = employersForPatch(form.employers)
  const emrUnion = employerEmrProficienciesUnion(employers)
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    email: form.email,
    phone: form.phone,
    license_number: form.license_number,
    license_state: form.license_state,
    emr_system: emrUnion || undefined,
    employers,
    credentials: form.credentials,
    specialties: form.specialties,
    years_nursing_experience: form.years_nursing_experience || undefined,
    compact_license_status: form.compact_license_status || undefined,
    average_patient_ratios: form.average_patient_ratios || undefined,
    specialized_medical_equipment: form.specialized_medical_equipment || undefined,
    education: form.education.length ? form.education : undefined,
  }
}

function isEmptyString(value: string | null | undefined): boolean {
  return !value?.trim()
}

function defaultParseMeta(): ParseMeta | null {
  return null
}

export type RestoreLocalResult = {
  restored: boolean
  savedAt?: string
}

export function useCandidateForm() {
  const candidateId = useState<string | null>('form-candidate-id', () => null)
  const currentStep = useState<number | 'success'>('form-step', () => 0)
  const saveStatus = useState<'idle' | 'saving' | 'saved' | 'error'>('save-status', () => 'idle')

  const form = useState('candidate-form', defaultForm)
  const parseMeta = useState<ParseMeta | null>('form-parse-meta', defaultParseMeta)

  const { intakeHeaders, token: inviteToken } = useIntakeInvite()
  const { snapshotHighlights, restoreHighlights, clearAllPrefillHighlights } = useIntakePrefillHighlight()
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let localSavedAt: string | undefined

  function resetWizard() {
    candidateId.value = null
    currentStep.value = 0
    saveStatus.value = 'idle'
    form.value = defaultForm()
    parseMeta.value = null
    localSavedAt = undefined
    clearAllPrefillHighlights()
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  function setParseMeta(meta: ParseMeta | null) {
    parseMeta.value = meta
  }

  function clearParseMeta() {
    parseMeta.value = null
  }

  function persistLocal(explicitToken?: string) {
    if (!import.meta.client) return
    const token = explicitToken || inviteToken.value
    if (!token) return
    localSavedAt = new Date().toISOString()
    localStorage.setItem(
      storageKey(token),
      JSON.stringify({
        candidateId: candidateId.value,
        step: currentStep.value,
        passedStep0: currentStep.value !== 0 && currentStep.value !== 'success',
        form: form.value,
        parseMeta: parseMeta.value,
        prefillHighlights: snapshotHighlights(),
        savedAt: localSavedAt,
      }),
    )
  }

  function restoreLocal(token: string): RestoreLocalResult {
    if (!import.meta.client || !token) return { restored: false }

    localStorage.removeItem(LEGACY_STORAGE_KEY)

    const raw = localStorage.getItem(storageKey(token))
    if (!raw) return { restored: false }
    try {
      const data = JSON.parse(raw) as {
        candidateId?: string
        step?: number | 'success'
        passedStep0?: boolean
        form?: ReturnType<typeof defaultForm>
        parseMeta?: ParseMeta | null
        prefillHighlights?: PrefillHighlightSnapshot
        savedAt?: string
      }

      if (data.candidateId) candidateId.value = data.candidateId
      if (data.form) {
        form.value = {
          ...defaultForm(),
          ...data.form,
          credentials: normalizeStoredCredentials(data.form.credentials),
        }
      }

      parseMeta.value = data.parseMeta ?? null
      restoreHighlights(data.prefillHighlights)
      localSavedAt = data.savedAt

      const step = data.step
      if (step == null || step === 'success') return { restored: false, savedAt: localSavedAt }

      if (step > 0 && !data.passedStep0) {
        currentStep.value = 0
        return { restored: false, savedAt: localSavedAt }
      }

      currentStep.value = step
      return {
        restored: typeof step === 'number' && step >= 1 && step <= 4,
        savedAt: localSavedAt,
      }
    } catch {
      return { restored: false }
    }
  }

  function clearLocal(explicitToken?: string) {
    if (!import.meta.client) return
    const token = explicitToken || inviteToken.value
    if (token) localStorage.removeItem(storageKey(token))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    parseMeta.value = null
    localSavedAt = undefined
    clearAllPrefillHighlights()
  }

  async function ensureDraft() {
    if (candidateId.value) return candidateId.value

    const res = await $fetch<{ id: string }>('/api/candidates', {
      method: 'POST',
      headers: intakeHeaders(),
    })
    candidateId.value = res.id
    saveStatus.value = 'saved'
    persistLocal()
    return res.id
  }

  async function patchCandidate(partial: CandidateDraftInput & { status?: string }) {
    if (!candidateId.value) return
    saveStatus.value = 'saving'
    try {
      const data = await $fetch<{ updated_at?: string }>(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: intakeHeaders(),
        body: partial,
      })
      saveStatus.value = 'saved'
      if (data?.updated_at) localSavedAt = data.updated_at
      persistLocal()
    } catch {
      saveStatus.value = 'error'
    }
  }

  async function flushAutosave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    if (!candidateId.value) return
    if (currentStep.value === 0 || currentStep.value === 'success') return
    await patchCandidate(formSnapshot(form.value))
  }

  function applyServerDraft(row: ServerDraftResponse) {
    const employers = backfillEmployerEmrSystems(
      stripEmployerSuggestions(row.employers ?? []),
      row.emr_system,
    )
    form.value = {
      ...defaultForm(),
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      license_number: row.license_number ?? '',
      license_state: row.license_state ?? '',
      emr_system: employerEmrProficienciesUnion(employers) || row.emr_system || '',
      employers,
      credentials: normalizeStoredCredentials(row.credentials ?? {}),
      specialties: row.specialties ?? [],
      years_nursing_experience: row.years_nursing_experience ?? '',
      compact_license_status: row.compact_license_status ?? '',
      average_patient_ratios: row.average_patient_ratios ?? '',
      specialized_medical_equipment: row.specialized_medical_equipment ?? '',
      education: row.education ?? [],
    }
  }

  function mergeServerDraft(row: ServerDraftResponse) {
    const serverTime = row.updated_at ? Date.parse(row.updated_at) : 0
    const localTime = localSavedAt ? Date.parse(localSavedAt) : 0
    const preferLocal = localTime > serverTime && Number.isFinite(localTime)

    if (!preferLocal) {
      applyServerDraft(row)
      return
    }

    const current = form.value
    form.value = {
      ...current,
      first_name: isEmptyString(current.first_name) ? (row.first_name ?? '') : current.first_name,
      last_name: isEmptyString(current.last_name) ? (row.last_name ?? '') : current.last_name,
      email: isEmptyString(current.email) ? (row.email ?? '') : current.email,
      phone: isEmptyString(current.phone) ? (row.phone ?? '') : current.phone,
      license_number: isEmptyString(current.license_number)
        ? (row.license_number ?? '')
        : current.license_number,
      license_state: isEmptyString(current.license_state)
        ? (row.license_state ?? '')
        : current.license_state,
      emr_system: isEmptyString(current.emr_system)
        ? (employerEmrProficienciesUnion(backfillEmployerEmrSystems(
          stripEmployerSuggestions(row.employers ?? []),
          row.emr_system,
        )) || row.emr_system || '')
        : current.emr_system,
      employers: current.employers.length
        ? current.employers
        : backfillEmployerEmrSystems(stripEmployerSuggestions(row.employers ?? []), row.emr_system),
      credentials: Object.keys(current.credentials).length
        ? current.credentials
        : normalizeStoredCredentials(row.credentials ?? {}),
      specialties: current.specialties.length ? current.specialties : (row.specialties ?? []),
      years_nursing_experience: isEmptyString(current.years_nursing_experience)
        ? (row.years_nursing_experience ?? '')
        : current.years_nursing_experience,
      compact_license_status: isEmptyString(current.compact_license_status)
        ? (row.compact_license_status ?? '')
        : current.compact_license_status,
      average_patient_ratios: isEmptyString(current.average_patient_ratios)
        ? (row.average_patient_ratios ?? '')
        : current.average_patient_ratios,
      specialized_medical_equipment: isEmptyString(current.specialized_medical_equipment)
        ? (row.specialized_medical_equipment ?? '')
        : current.specialized_medical_equipment,
      education: current.education.length ? current.education : (row.education ?? []),
    }
  }

  async function loadDraftFromServer(id: string): Promise<ServerDraftResponse | null> {
    try {
      return await $fetch<ServerDraftResponse>(`/api/candidates/${id}`, {
        headers: intakeHeaders(),
      })
    } catch {
      return null
    }
  }

  async function hydrateDraftFromServer(): Promise<boolean> {
    if (!candidateId.value) return false
    const row = await loadDraftFromServer(candidateId.value)
    if (!row || row.status !== 'draft') return false
    mergeServerDraft(row)
    persistLocal()
    return true
  }

  function scheduleAutosave(partial: CandidateDraftInput) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      Object.assign(form.value, partial)
      patchCandidate(formSnapshot(form.value))
    }, 800)
  }

  function applyParseResult(data: {
    candidateId?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    license_number?: string
    license_state?: string
    emr_system?: string
    specialties?: string[]
    years_nursing_experience?: string
    compact_license_status?: string
    average_patient_ratios?: string
    specialized_medical_equipment?: string
    education?: EducationEntry[]
    suggested_employers?: Array<EmployerEntry & { employer_hospital_suggestions?: HospitalSuggestion[] }>
    detected_credentials?: string[]
    credentials?: CredentialsMap
    fields_found?: number
    partial_parse?: boolean
  }): number {
    if (data.candidateId) candidateId.value = data.candidateId

    if (data.first_name) form.value.first_name = data.first_name
    if (data.last_name) form.value.last_name = data.last_name
    if (data.email) form.value.email = data.email
    if (data.phone) form.value.phone = data.phone
    if (data.license_number) form.value.license_number = data.license_number
    if (data.license_state) form.value.license_state = data.license_state
    if (data.emr_system) form.value.emr_system = data.emr_system
    if (data.specialties?.length) form.value.specialties = data.specialties
    if (data.years_nursing_experience) {
      form.value.years_nursing_experience = data.years_nursing_experience
    }
    if (data.compact_license_status) {
      form.value.compact_license_status = data.compact_license_status
    }
    if (data.average_patient_ratios) {
      form.value.average_patient_ratios = data.average_patient_ratios
    }
    if (data.specialized_medical_equipment) {
      form.value.specialized_medical_equipment = data.specialized_medical_equipment
    }
    if (data.education?.length) form.value.education = [...data.education]
    if (data.suggested_employers?.length) {
      form.value.employers = mapParsedEmployers(data.suggested_employers)
    }
    if (data.credentials && Object.keys(data.credentials).length) {
      form.value.credentials = normalizeStoredCredentials(data.credentials)
    } else if (data.detected_credentials?.length) {
      for (const cert of data.detected_credentials) {
        form.value.credentials[cert.toUpperCase()] = { active: true }
      }
    }

    scheduleAutosave({})

    return data.fields_found ?? countFilledFromForm()
  }

  function countFilledFromForm(): number {
    let count = 0
    if (form.value.first_name) count++
    if (form.value.last_name) count++
    if (form.value.email) count++
    if (form.value.phone) count++
    if (form.value.license_number) count++
    if (form.value.license_state) count++
    if (form.value.employers.length) count++
    return count
  }

  function formatFetchError(e: unknown, fallback: string): string {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    return err.data?.statusMessage || err.message || fallback
  }

  async function downloadDocxOnly() {
    if (!candidateId.value) {
      throw new Error('Could not download your packet. Go back and try again.')
    }

    try {
      await downloadResumeDocxFromApi({
        body: { id: candidateId.value },
        headers: intakeHeaders(),
        firstName: form.value.first_name,
        lastName: form.value.last_name,
      })
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : formatFetchError(e, 'Could not generate your resume file.'))
    }
  }

  async function finalizeAndDownload(options?: {
    onPhase?: (phase: FinalizePhase) => void
  }) {
    if (!candidateId.value) {
      await ensureDraft()
    }
    if (!candidateId.value) {
      throw new Error('Could not start your application. Go back and try again.')
    }

    options?.onPhase?.('saving')
    saveStatus.value = 'saving'
    try {
      const data = await $fetch<{ updated_at?: string }>(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: intakeHeaders(),
        body: { ...formSnapshot(form.value) },
      })
      saveStatus.value = 'saved'
      if (data?.updated_at) localSavedAt = data.updated_at
    } catch (e) {
      saveStatus.value = 'error'
      throw new Error(formatFetchError(e, 'Could not save your answers.'))
    }

    options?.onPhase?.('generating')
    try {
      await downloadDocxOnly()
    } catch (e) {
      throw e instanceof Error ? e : new Error(formatFetchError(e, 'Could not generate your resume file.'))
    }

    options?.onPhase?.('finalizing')
    try {
      await $fetch(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: intakeHeaders(),
        body: { status: 'submitted' },
      })
    } catch (e) {
      throw new Error(formatFetchError(e, 'Download succeeded but submission could not be finalized.'))
    }

    options?.onPhase?.('email')
    let confirmationEmailSent = false
    try {
      const emailResult = await $fetch<{ sent?: boolean; skipped?: boolean }>(
        `/api/candidates/${candidateId.value}/send-confirmation`,
        {
          method: 'POST',
          headers: intakeHeaders(),
        },
      )
      confirmationEmailSent = emailResult.sent === true
    } catch {
      confirmationEmailSent = false
    }

    return { confirmationEmailSent }
  }

  return {
    candidateId,
    currentStep,
    saveStatus,
    form,
    parseMeta,
    certKeys: CERT_KEYS,
    resetWizard,
    ensureDraft,
    scheduleAutosave,
    flushAutosave,
    applyParseResult,
    applyServerDraft,
    mergeServerDraft,
    loadDraftFromServer,
    hydrateDraftFromServer,
    patchCandidate,
    finalizeAndDownload,
    downloadDocxOnly,
    setParseMeta,
    clearParseMeta,
    persistLocal,
    restoreLocal,
    clearLocal,
  }
}
