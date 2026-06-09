export type IntakePreviewMode = 'client' | 'admin'

const STORAGE_PREFIX = 'intake-preview-mode:'

function storageKey(token: string) {
  return `${STORAGE_PREFIX}${token}`
}

/** Recruiter-only intake preview: client view matches candidate gates; admin view unblocks navigation. */
export function useIntakePreviewMode(token: Ref<string> | ComputedRef<string>) {
  const recruiterUser = useSupabaseUser()
  const isRecruiterPreview = computed(() => Boolean(recruiterUser.value))

  const previewMode = ref<IntakePreviewMode>('client')

  watch(
    token,
    (value) => {
      if (!import.meta.client || !value) {
        previewMode.value = 'client'
        return
      }
      const stored = sessionStorage.getItem(storageKey(value))
      previewMode.value = stored === 'admin' ? 'admin' : 'client'
    },
    { immediate: true },
  )

  function setPreviewMode(mode: IntakePreviewMode) {
    previewMode.value = mode
    if (import.meta.client && token.value) {
      sessionStorage.setItem(storageKey(token.value), mode)
    }
  }

  const isAdminView = computed(() => isRecruiterPreview.value && previewMode.value === 'admin')
  const isClientView = computed(() => !isAdminView.value)

  return {
    isRecruiterPreview,
    previewMode,
    isAdminView,
    isClientView,
    setPreviewMode,
  }
}
