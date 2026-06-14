<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  ready: [payload: { candidateId: string; inviteId: string; url: string; copied: boolean }]
}>()

const supabase = useSupabaseClient()
const loading = ref(false)
const error = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      selectedFile.value = null
      error.value = null
      loading.value = false
    }
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

async function createInviteAndCandidate() {
  const headers = await authHeaders()
  const invite = await $fetch<{ id: string; url: string; expires_at: string }>('/api/invites', {
    method: 'POST',
    headers,
    body: { expires_in_days: 7 },
  })
  const created = await $fetch<{ id: string }>('/api/admin/candidates', {
    method: 'POST',
    headers,
    body: { intake_invite_id: invite.id },
  })
  let copied = false
  try {
    await navigator.clipboard.writeText(invite.url)
    copied = true
  } catch {
    copied = false
  }
  return { invite, candidateId: created.id, copied }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  error.value = null
}

function chooseFile() {
  fileInputRef.value?.click()
}

async function onUploadPath() {
  if (!selectedFile.value) {
    error.value = 'Choose a resume file to upload.'
    return
  }
  loading.value = true
  error.value = null
  try {
    const { invite, candidateId, copied } = await createInviteAndCandidate()
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    await $fetch(`/api/admin/candidates/${candidateId}/parse`, {
      method: 'POST',
      headers: await authHeaders(),
      body: formData,
    })
    emit('ready', { candidateId, inviteId: invite.id, url: invite.url, copied })
    emit('close')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not create packet from upload'
  } finally {
    loading.value = false
  }
}

async function onScratchPath() {
  loading.value = true
  error.value = null
  try {
    const { invite, candidateId, copied } = await createInviteAndCandidate()
    emit('ready', { candidateId, inviteId: invite.id, url: invite.url, copied })
    emit('close')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not create packet'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    role="presentation"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-packet-title"
    >
      <h2 id="new-packet-title" class="text-lg font-semibold text-slate-900">New candidate packet</h2>
      <p class="mt-1 text-sm text-slate-600">
        Upload a resume to parse and prefill, or start with an empty builder. Copy the intake link from the builder when you are ready to hand off.
      </p>

      <div class="mt-5 space-y-4">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-medium text-slate-900">Upload resume</p>
          <p class="mt-1 text-xs text-slate-600">PDF or Word (.docx), max 10MB.</p>
          <input
            ref="fileInputRef"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            class="hidden"
            :disabled="loading"
            @change="onFileInput"
          >
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              :disabled="loading"
              @click="chooseFile"
            >
              Choose file
            </button>
            <span v-if="selectedFile" class="min-w-0 truncate text-sm text-slate-600">{{ selectedFile.name }}</span>
            <span v-else class="text-sm text-slate-500">No file selected</span>
          </div>
          <button
            type="button"
            class="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="loading || !selectedFile"
            @click="onUploadPath"
          >
            {{ loading ? 'Creating…' : 'Create & parse' }}
          </button>
        </div>

        <div class="relative flex items-center py-1">
          <div class="flex-1 border-t border-slate-200" />
          <span class="px-3 text-xs text-slate-500">or</span>
          <div class="flex-1 border-t border-slate-200" />
        </div>

        <button
          type="button"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          :disabled="loading"
          @click="onScratchPath"
        >
          {{ loading ? 'Creating…' : 'Start from scratch' }}
        </button>
      </div>

      <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="mt-6 flex justify-end">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" :disabled="loading" @click="emit('close')">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
