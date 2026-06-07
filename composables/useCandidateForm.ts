import type {
  EmployerEntry,
  CandidateDraftInput,
  EducationEntry,
  CredentialsMap,
  CredentialEntry,
} from '~/types/candidate'
import type { HospitalSuggestion } from '~/types/hospital'
import { employersForPatch, mapParsedEmployers } from '~/utils/employerLink'

const LEGACY_STORAGE_KEY = 'resume-rocket-draft'
const CERT_KEYS = ['BLS', 'ACLS', 'PALS', 'NIHSS', 'TNCC', 'CCRN'] as const

function normalizeStoredCredentials(raw: unknown): CredentialsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: CredentialsMap = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) {
      out[key.toUpperCase()] = { active: true }
    } else if (value && typeof value === 'object' && 'active' in (value as CredentialEntry)) {
      const entry = value as CredentialEntry
      out[key.toUpperCase()] = entry.active || entry.expiry
        ? { active: entry.active ?? true, expiry: entry.expiry }
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

export type ParseMeta = {
  document_scan?: boolean
  partial_parse?: boolean
  fields_found?: number
}

function defaultParseMeta(): ParseMeta | null {
  return null
}

export function useCandidateForm() {
  const candidateId = useState<string | null>('form-candidate-id', () => null)
  const currentStep = useState<number | 'success'>('form-step', () => 0)
  const saveStatus = useState<'idle' | 'saving' | 'saved' | 'error'>('save-status', () => 'idle')

  const form = useState('candidate-form', defaultForm)
  const parseMeta = useState<ParseMeta | null>('form-parse-meta', defaultParseMeta)

  const { intakeHeaders, token: inviteToken } = useIntakeInvite()
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function resetWizard() {
    candidateId.value = null
    currentStep.value = 0
    saveStatus.value = 'idle'
    form.value = defaultForm()
    parseMeta.value = null
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
    localStorage.setItem(
      storageKey(token),
      JSON.stringify({
        candidateId: candidateId.value,
        step: currentStep.value,
        passedStep0: currentStep.value !== 0 && currentStep.value !== 'success',
        form: form.value,
        parseMeta: parseMeta.value,
      }),
    )
  }

  function restoreLocal(token: string): boolean {
    if (!import.meta.client || !token) return false

    // Drop pre-token-scoping drafts that leaked steps across invite links.
    localStorage.removeItem(LEGACY_STORAGE_KEY)

    const raw = localStorage.getItem(storageKey(token))
    if (!raw) return false
    try {
      const data = JSON.parse(raw) as {
        candidateId?: string
        step?: number | 'success'
        passedStep0?: boolean
        form?: ReturnType<typeof defaultForm>
        parseMeta?: ParseMeta | null
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

      const step = data.step
      if (step == null || step === 'success') return false

      if (step > 0 && !data.passedStep0) {
        currentStep.value = 0
        return false
      }

      currentStep.value = step
      return typeof step === 'number' && step >= 1 && step <= 4
    } catch {
      return false
    }
  }

  function clearLocal(explicitToken?: string) {
    if (!import.meta.client) return
    const token = explicitToken || inviteToken.value
    if (token) localStorage.removeItem(storageKey(token))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    parseMeta.value = null
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
      await $fetch(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: intakeHeaders(),
        body: partial,
      })
      saveStatus.value = 'saved'
      persistLocal()
    } catch {
      saveStatus.value = 'error'
    }
  }

  function scheduleAutosave(partial: CandidateDraftInput) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      Object.assign(form.value, partial)
      patchCandidate({
        first_name: form.value.first_name,
        last_name: form.value.last_name,
        email: form.value.email,
        phone: form.value.phone,
        license_number: form.value.license_number,
        license_state: form.value.license_state,
        emr_system: form.value.emr_system,
        employers: employersForPatch(form.value.employers),
        credentials: form.value.credentials,
        specialties: form.value.specialties,
        years_nursing_experience: form.value.years_nursing_experience || undefined,
        compact_license_status: form.value.compact_license_status || undefined,
        average_patient_ratios: form.value.average_patient_ratios || undefined,
        specialized_medical_equipment: form.value.specialized_medical_equipment || undefined,
        education: form.value.education.length ? form.value.education : undefined,
      })
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
    specialties?: string[]
    years_nursing_experience?: string
    compact_license_status?: string
    average_patient_ratios?: string
    specialized_medical_equipment?: string
    education?: EducationEntry[]
    suggested_employers?: Array<EmployerEntry & { employer_hospital_suggestions?: HospitalSuggestion[] }>
    detected_credentials?: string[]
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
    if (data.detected_credentials?.length) {
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
      const blob = await $fetch<Blob>('/api/generate-docx', {
        method: 'POST',
        headers: intakeHeaders(),
        body: { id: candidateId.value },
        responseType: 'blob',
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume-${form.value.last_name || 'candidate'}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      throw new Error(formatFetchError(e, 'Could not generate your resume file.'))
    }
  }

  async function finalizeAndDownload() {
    if (!candidateId.value) {
      await ensureDraft()
    }
    if (!candidateId.value) {
      throw new Error('Could not start your application. Go back and try again.')
    }

    saveStatus.value = 'saving'
    try {
      await $fetch(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: intakeHeaders(),
        body: { ...form.value, employers: employersForPatch(form.value.employers) },
      })
      saveStatus.value = 'saved'
    } catch (e) {
      saveStatus.value = 'error'
      throw new Error(formatFetchError(e, 'Could not save your answers.'))
    }

    try {
      await downloadDocxOnly()
    } catch (e) {
      throw e instanceof Error ? e : new Error(formatFetchError(e, 'Could not generate your resume file.'))
    }

    try {
      await $fetch(`/api/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: intakeHeaders(),
        body: { status: 'submitted' },
      })
    } catch (e) {
      throw new Error(formatFetchError(e, 'Download succeeded but submission could not be finalized.'))
    }

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

    currentStep.value = 'success'
    clearLocal()
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
    applyParseResult,
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
