<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  ready: [payload: { candidateId: string; inviteId: string; url: string; copied: boolean }]
  linkReady: [payload: { candidateId: string; inviteId: string; url: string; copied: boolean }]
}>()

const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_BYTES = 10 * 1024 * 1024

const supabase = useSupabaseClient()
const loading = ref(false)
const loadingKind = ref<'link' | 'upload' | 'scratch' | null>(null)
const error = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const linkResult = ref<{ url: string; copied: boolean; displayName: string } | null>(null)
const copiedAgain = ref(false)
const dragOver = ref(false)

const firstName = ref('')
const lastName = ref('')
const email = ref('')

function resetIdentityFields() {
  firstName.value = ''
  lastName.value = ''
  email.value = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      error.value = null
      loading.value = false
      loadingKind.value = null
      linkResult.value = null
      copiedAgain.value = false
      dragOver.value = false
      resetIdentityFields()
    }
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open && !loading.value) {
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

function validateIdentity(): boolean {
  const first = firstName.value.trim()
  const last = lastName.value.trim()
  if (!first || !last) {
    error.value = 'First and last name are required.'
    return false
  }
  const emailTrimmed = email.value.trim()
  if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    error.value = 'Enter a valid email, or leave it blank.'
    return false
  }
  error.value = null
  return true
}

function displayName() {
  return `${firstName.value.trim()} ${lastName.value.trim()}`.trim()
}

async function createInviteAndCandidate() {
  if (!validateIdentity()) {
    throw new Error(error.value || 'First and last name are required.')
  }
  const headers = await authHeaders()
  const invite = await $fetch<{ id: string; url: string; expires_at: string }>('/api/invites', {
    method: 'POST',
    headers,
    body: {
      expires_in_days: 7,
      candidate_first_name: firstName.value.trim(),
      candidate_last_name: lastName.value.trim(),
      candidate_email: email.value.trim() || undefined,
    },
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

function isAllowedResume(file: File) {
  const name = file.name.toLowerCase()
  const type = file.type
  const okExt = name.endsWith('.pdf') || name.endsWith('.docx')
  const okType = type === 'application/pdf'
    || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || type === ''
  return okExt || okType
}

async function createFromFile(file: File) {
  if (!validateIdentity()) return
  if (!isAllowedResume(file)) {
    error.value = 'Use a PDF or Word (.docx) file.'
    return
  }
  if (file.size > MAX_BYTES) {
    error.value = 'File must be 10MB or smaller.'
    return
  }

  loading.value = true
  loadingKind.value = 'upload'
  error.value = null
  try {
    const { invite, candidateId, copied } = await createInviteAndCandidate()
    const formData = new FormData()
    formData.append('file', file)
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
    loadingKind.value = null
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void createFromFile(file)
}

function chooseFile() {
  if (loading.value) return
  if (!validateIdentity()) return
  fileInputRef.value?.click()
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (loading.value) return
  dragOver.value = true
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  if (loading.value) return
  const file = event.dataTransfer?.files?.[0]
  if (file) void createFromFile(file)
}

async function onSendLinkPath() {
  if (!validateIdentity()) return
  loading.value = true
  loadingKind.value = 'link'
  error.value = null
  copiedAgain.value = false
  try {
    const { invite, candidateId, copied } = await createInviteAndCandidate()
    linkResult.value = { url: invite.url, copied, displayName: displayName() }
    emit('linkReady', { candidateId, inviteId: invite.id, url: invite.url, copied })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not create candidate link'
  } finally {
    loading.value = false
    loadingKind.value = null
  }
}

async function copyLinkAgain() {
  if (!linkResult.value) return
  try {
    await navigator.clipboard.writeText(linkResult.value.url)
    linkResult.value = { ...linkResult.value, copied: true }
    copiedAgain.value = true
  } catch {
    error.value = 'Could not copy — select the link and copy manually.'
  }
}

async function onScratchPath() {
  if (!validateIdentity()) return
  loading.value = true
  loadingKind.value = 'scratch'
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
    loadingKind.value = null
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    role="presentation"
    @click.self="!loading && emit('close')"
  >
    <div
      class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-packet-title"
    >
      <template v-if="linkResult">
        <h2 id="new-packet-title" class="text-lg font-semibold text-slate-900">Candidate link ready</h2>
        <p class="mt-1 text-sm text-slate-600">
          Send this link to {{ linkResult.displayName }}. They can upload their resume and complete the packet on their phone.
        </p>
        <label class="mt-4 block text-xs font-medium text-slate-600" for="intake-link-url">Candidate link</label>
        <input
          id="intake-link-url"
          type="text"
          readonly
          class="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
          :value="linkResult.url"
          @focus="($event.target as HTMLInputElement).select()"
        >
        <p v-if="linkResult.copied || copiedAgain" class="mt-2 text-sm text-emerald-700" role="status">
          {{ copiedAgain ? 'Copied again.' : 'Copied to clipboard.' }}
        </p>
        <p v-else class="mt-2 text-sm text-slate-500">
          Clipboard was blocked — select the link and copy manually.
        </p>
        <p v-if="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            @click="copyLinkAgain"
          >
            Copy link
          </button>
          <button
            type="button"
            class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-accent-600"
            @click="emit('close')"
          >
            Done
          </button>
        </div>
      </template>

      <template v-else>
        <h2 id="new-packet-title" class="text-lg font-semibold text-slate-900">New candidate packet</h2>
        <p class="mt-1 text-sm text-slate-600">
          Who is this packet for? Then send a link, upload a resume, or start from scratch.
        </p>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="block text-xs font-medium text-slate-600" for="packet-first-name">First name</label>
            <input
              id="packet-first-name"
              v-model="firstName"
              type="text"
              autocomplete="given-name"
              required
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              :disabled="loading"
            >
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600" for="packet-last-name">Last name</label>
            <input
              id="packet-last-name"
              v-model="lastName"
              type="text"
              autocomplete="family-name"
              required
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              :disabled="loading"
            >
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-xs font-medium text-slate-600" for="packet-email">Email (optional)</label>
          <input
            id="packet-email"
            v-model="email"
            type="email"
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            :disabled="loading"
            placeholder="For search and confirmation later"
          >
        </div>

        <div class="mt-5 space-y-4">
          <div>
            <button
              type="button"
              class="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
              :disabled="loading"
              @click="onSendLinkPath"
            >
              {{ loadingKind === 'link' ? 'Creating…' : 'Create & copy candidate link' }}
            </button>
            <p class="mt-1.5 text-xs text-slate-500">Candidate uploads when they open the link · expires in 7 days</p>
          </div>

          <div class="relative flex items-center py-1">
            <div class="flex-1 border-t border-slate-200" />
            <span class="px-3 text-xs text-slate-500">or</span>
            <div class="flex-1 border-t border-slate-200" />
          </div>

          <input
            ref="fileInputRef"
            type="file"
            :accept="ACCEPT"
            class="hidden"
            :disabled="loading"
            @change="onFileInput"
          >

          <div
            class="rounded-lg border-2 border-dashed px-4 py-5 text-center transition"
            :class="[
              loading
                ? 'pointer-events-none border-brand-300 bg-brand-50/50'
                : dragOver
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-300 bg-white',
            ]"
            @dragover="onDragOver"
            @dragleave="dragOver = false"
            @drop="onDrop"
          >
            <p v-if="loadingKind === 'upload'" class="text-sm font-medium text-brand-800">
              Creating & parsing…
            </p>
            <template v-else>
              <p class="text-sm text-slate-700">Drop PDF or Word here</p>
              <button
                type="button"
                class="mt-2 text-sm font-medium text-brand-700 underline-offset-2 hover:underline disabled:opacity-50"
                :disabled="loading"
                @click="chooseFile"
              >
                or browse
              </button>
              <p class="mt-1 text-xs text-slate-500">Max 10MB</p>
            </template>
          </div>

          <button
            type="button"
            class="w-full py-1.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
            :disabled="loading"
            @click="onScratchPath"
          >
            {{ loadingKind === 'scratch' ? 'Creating…' : 'Start from scratch' }}
          </button>
        </div>

        <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error }}</p>
        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            :disabled="loading"
            @click="emit('close')"
          >
            Cancel
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
