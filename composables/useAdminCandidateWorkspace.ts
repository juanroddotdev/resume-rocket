import type { Ref } from 'vue'
import type { CandidateRow } from '~/types/candidate'
import type { ParseMeta } from '~/types/parse'
import {
  applyAdminDraftToForm,
  applyParseResultToForm,
  candidateFormSnapshot,
  defaultCandidateForm,
  type AdminDraftResponse,
  type AdminSectionId,
} from '~/utils/adminCandidateForm'

const CERT_KEYS = ['BLS', 'ACLS', 'PALS', 'NIHSS', 'TNCC', 'CCRN'] as const

export function useAdminCandidateWorkspace(selected: Ref<CandidateRow | null>) {
  const supabase = useSupabaseClient()
  const form = reactive(defaultCandidateForm())
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const parseMeta = ref<ParseMeta | null>(null)
  const activeSection = ref<AdminSectionId>('resume')
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const candidateStatus = ref<string>('draft')
  const resumeFilename = ref<string | null>(null)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const candidateId = computed(() => selected.value?.id ?? null)
  const isEditable = computed(() => candidateStatus.value === 'draft')
  const intakeUrl = computed(() => selected.value?.intake_url ?? null)

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Sign in required')
    }
    return { Authorization: `Bearer ${session.access_token}` }
  }

  function resetFormState() {
    Object.assign(form, defaultCandidateForm())
    parseMeta.value = null
    saveStatus.value = 'idle'
    activeSection.value = 'resume'
    loadError.value = null
    candidateStatus.value = 'draft'
    resumeFilename.value = null
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  async function loadDraft() {
    if (!candidateId.value) {
      resetFormState()
      return
    }
    loading.value = true
    loadError.value = null
    try {
      const row = await $fetch<AdminDraftResponse>(`/api/admin/candidates/${candidateId.value}/draft`, {
        headers: await authHeaders(),
      })
      candidateStatus.value = row.status
      if (row.status !== 'draft') {
        loadError.value = 'This candidate is already submitted. The invite link is locked for editing.'
        return
      }
      applyAdminDraftToForm(form, row)
      resumeFilename.value = row.resume_original_filename ?? null
      if (selected.value?.parse_outcome) {
        parseMeta.value = {
          document_scan: selected.value.parse_outcome.document_scan,
          partial_parse: selected.value.parse_outcome.partial_parse,
          fields_found: selected.value.parse_outcome.fields_found,
        }
      }
      saveStatus.value = 'saved'
    } catch {
      loadError.value = 'Could not load candidate draft. Try again.'
    } finally {
      loading.value = false
    }
  }

  watch(candidateId, () => {
    loadDraft()
  }, { immediate: true })

  async function patchCandidate(partial?: ReturnType<typeof candidateFormSnapshot>) {
    if (!candidateId.value || !isEditable.value) return
    saveStatus.value = 'saving'
    try {
      await $fetch(`/api/admin/candidates/${candidateId.value}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: partial ?? candidateFormSnapshot(form),
      })
      saveStatus.value = 'saved'
    } catch {
      saveStatus.value = 'error'
    }
  }

  function scheduleAutosave() {
    if (!isEditable.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      patchCandidate()
    }, 800)
  }

  async function flushAutosave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    await patchCandidate()
  }

  function onParsed(
    data: Record<string, unknown>,
    options?: { focusIdentity?: boolean },
  ) {
    applyParseResultToForm(form, data as Parameters<typeof applyParseResultToForm>[1])
    parseMeta.value = {
      document_scan: Boolean(data.document_scan),
      partial_parse: Boolean(data.partial_parse),
      fields_found: typeof data.fields_found === 'number' ? data.fields_found : undefined,
    }
    scheduleAutosave()
    if (options?.focusIdentity !== false) {
      activeSection.value = 'identity'
    }
  }

  async function ensureCandidateForInvite(intakeInviteId: string): Promise<string | null> {
    try {
      const res = await $fetch<{ id: string }>('/api/admin/candidates', {
        method: 'POST',
        headers: await authHeaders(),
        body: { intake_invite_id: intakeInviteId },
      })
      return res.id
    } catch {
      return null
    }
  }

  async function downloadDraftDocx() {
    if (!candidateId.value) throw new Error('Select a candidate first.')
    await flushAutosave()
    await downloadResumeDocxFromApi({
      body: { id: candidateId.value },
      headers: await authHeaders(),
      firstName: form.first_name,
      lastName: form.last_name,
    })
  }

  async function markSubmitted() {
    if (!candidateId.value) throw new Error('Select a candidate first.')
    await flushAutosave()
    await downloadDraftDocx()
    await $fetch(`/api/admin/candidates/${candidateId.value}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: { status: 'submitted' },
    })
    candidateStatus.value = 'submitted'
  }

  function scrollToSection(section: AdminSectionId) {
    activeSection.value = section
    if (!import.meta.client) return
    nextTick(() => {
      const el = document.getElementById(`admin-section-${section}`)
      const canvas = el?.closest('[data-admin-builder-canvas]') as HTMLElement | null
      if (canvas && el) {
        const canvasTop = canvas.getBoundingClientRect().top
        const elTop = el.getBoundingClientRect().top
        canvas.scrollTo({
          top: canvas.scrollTop + (elTop - canvasTop),
          behavior: 'smooth',
        })
        return
      }
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return {
    form,
    saveStatus,
    parseMeta,
    activeSection,
    loading,
    loadError,
    candidateStatus,
    resumeFilename,
    isEditable,
    intakeUrl,
    certKeys: CERT_KEYS,
    scheduleAutosave,
    flushAutosave,
    onParsed,
    downloadDraftDocx,
    markSubmitted,
    scrollToSection,
    ensureCandidateForInvite,
    authHeaders,
    reload: loadDraft,
  }
}
