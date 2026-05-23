import type { EmployerEntry, CandidateDraftInput } from '~/types/candidate'

const STORAGE_KEY = 'resume-rocket-draft'
const CERT_KEYS = ['BLS', 'ACLS', 'PALS', 'NIHSS', 'TNCC', 'CCRN'] as const

export function useCandidateForm() {
  const candidateId = useState<string | null>('form-candidate-id', () => null)
  const currentStep = useState<number | 'success'>('form-step', () => 0)
  const saveStatus = useState<'idle' | 'saving' | 'saved' | 'error'>('save-status', () => 'idle')

  const form = useState('candidate-form', () => ({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    license_state: '',
    emr_system: '',
    employers: [] as EmployerEntry[],
    credentials: {} as Record<string, boolean>,
    specialties: [] as string[],
  }))

  const { intakeHeaders } = useIntakeInvite()
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function persistLocal() {
    if (!import.meta.client) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        candidateId: candidateId.value,
        step: currentStep.value,
        form: form.value,
      }),
    )
  }

  function restoreLocal() {
    if (!import.meta.client) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data.candidateId) candidateId.value = data.candidateId
      if (data.step != null) currentStep.value = data.step
      if (data.form) form.value = { ...form.value, ...data.form }
    } catch {
      /* ignore */
    }
  }

  function clearLocal() {
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  async function ensureDraft() {
    if (candidateId.value) return candidateId.value

    const res = await $fetch<{ id: string }>('/api/candidates', {
      method: 'POST',
      headers: intakeHeaders(),
    })
    candidateId.value = res.id
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
        employers: form.value.employers,
        credentials: form.value.credentials,
        specialties: form.value.specialties,
      })
    }, 800)
  }

  function applyParseResult(data: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    license_number?: string
    license_state?: string
    specialties?: string[]
    suggested_employers?: EmployerEntry[]
  }) {
    if (data.first_name) form.value.first_name = data.first_name
    if (data.last_name) form.value.last_name = data.last_name
    if (data.email) form.value.email = data.email
    if (data.phone) form.value.phone = data.phone
    if (data.license_number) form.value.license_number = data.license_number
    if (data.license_state) form.value.license_state = data.license_state
    if (data.specialties) form.value.specialties = data.specialties
    if (data.suggested_employers?.length) {
      form.value.employers = [...data.suggested_employers]
    }
    scheduleAutosave({})
  }

  async function finalizeAndDownload() {
    await patchCandidate({ ...form.value, status: 'submitted' })

    await $fetch(`/api/candidates/${candidateId.value}/send-confirmation`, {
      method: 'POST',
      headers: intakeHeaders(),
    }).catch(() => null)

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

    currentStep.value = 'success'
    clearLocal()
  }

  return {
    candidateId,
    currentStep,
    saveStatus,
    form,
    certKeys: CERT_KEYS,
    ensureDraft,
    scheduleAutosave,
    applyParseResult,
    patchCandidate,
    finalizeAndDownload,
    persistLocal,
    restoreLocal,
    clearLocal,
  }
}
