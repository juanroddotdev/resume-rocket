<script setup lang="ts">
import { parseStageProgress } from '~/utils/intakeProcessing'
import type { AdminSettingsResponse } from '~/utils/adminSettings'
import {
  DEFAULT_APP_SETTINGS,
  formatUploadSize,
  isAllowedConfiguredUpload,
  uploadAcceptAttribute,
  uploadTypeLabel,
} from '~/utils/adminSettings'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  ready: [payload: { candidateId: string; inviteId: string; url: string; copied: boolean }]
  linkReady: [payload: { candidateId: string; inviteId: string; url: string; copied: boolean }]
}>()

type PacketPath = 'link' | 'upload' | 'scratch'

const PDF_STAGES = [
  'Uploading file…',
  'Reading document…',
  'Scanning with AI…',
  'Extracting placement fields…',
] as const

const DOCX_STAGES = [
  'Uploading file…',
  'Extracting text…',
  'Analyzing resume…',
] as const

const LONG_WAIT_MESSAGES = [
  'Still working — image PDFs can take up to a minute',
  'Almost there…',
  'Checking licenses, employers, and credentials…',
] as const

const STAGE_INTERVAL_MS = 8000

const supabase = useSupabaseClient()
const loading = ref(false)
const loadingKind = ref<PacketPath | null>(null)
const error = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const linkResult = ref<{ url: string; copied: boolean; displayName: string } | null>(null)
const copiedAgain = ref(false)
const dragOver = ref(false)
const path = ref<PacketPath | null>(null)

const firstName = ref('')
const lastName = ref('')
const packetSettings = ref<Pick<AdminSettingsResponse, 'default_invite_expiration_days' | 'allowed_upload_mime_types' | 'max_upload_bytes'>>({
  default_invite_expiration_days: DEFAULT_APP_SETTINGS.default_invite_expiration_days,
  allowed_upload_mime_types: [...DEFAULT_APP_SETTINGS.allowed_upload_mime_types],
  max_upload_bytes: DEFAULT_APP_SETTINGS.max_upload_bytes,
})

const acceptAttr = computed(() => uploadAcceptAttribute(packetSettings.value.allowed_upload_mime_types))
const uploadTypeCopy = computed(() => uploadTypeLabel(packetSettings.value.allowed_upload_mime_types))
const uploadSizeCopy = computed(() => formatUploadSize(packetSettings.value.max_upload_bytes))
const expirationCopy = computed(() =>
  `expires in ${packetSettings.value.default_invite_expiration_days} day${packetSettings.value.default_invite_expiration_days === 1 ? '' : 's'}`,
)

const reducedMotion = ref(false)
const parseStage = ref('')
const parseProgress = ref(0)
const parseCardStatus = ref<'active' | 'success'>('active')

let stageTimer: ReturnType<typeof setInterval> | null = null
let stageIndex = 0
let stageList: readonly string[] = PDF_STAGES

const detailTitle = computed(() => {
  switch (path.value) {
    case 'link':
      return 'Send candidate link'
    case 'upload':
      return 'Upload resume'
    case 'scratch':
      return 'Start from scratch'
    default:
      return 'New candidate packet'
  }
})

const uploadParseMessage = computed(() => {
  if (reducedMotion.value) return 'Working…'
  return parseStage.value || 'Creating & parsing…'
})

function resetIdentityFields() {
  firstName.value = ''
  lastName.value = ''
}

function stopStageRotation() {
  if (stageTimer) {
    clearInterval(stageTimer)
    stageTimer = null
  }
}

function updateParseProgress() {
  parseProgress.value = parseStageProgress(stageIndex, stageList.length)
}

function startStageRotation(isPdf: boolean) {
  stopStageRotation()
  stageList = isPdf ? PDF_STAGES : DOCX_STAGES
  stageIndex = 0
  parseStage.value = stageList[0]!
  parseCardStatus.value = 'active'
  updateParseProgress()

  stageTimer = setInterval(() => {
    stageIndex++
    if (stageIndex < stageList.length) {
      parseStage.value = stageList[stageIndex]!
    } else {
      const longIdx = (stageIndex - stageList.length) % LONG_WAIT_MESSAGES.length
      parseStage.value = LONG_WAIT_MESSAGES[longIdx]!
    }
    updateParseProgress()
  }, STAGE_INTERVAL_MS)
}

function selectPath(next: PacketPath) {
  if (loading.value) return
  error.value = null
  path.value = next
}

function goBackToChoose() {
  if (loading.value) return
  error.value = null
  dragOver.value = false
  path.value = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadPacketSettings()
    } else {
      stopStageRotation()
      error.value = null
      loading.value = false
      loadingKind.value = null
      linkResult.value = null
      copiedAgain.value = false
      dragOver.value = false
      path.value = null
      parseStage.value = ''
      parseProgress.value = 0
      parseCardStatus.value = 'active'
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

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  if (!import.meta.client) return
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = mq.matches
  mq.addEventListener('change', (e) => {
    reducedMotion.value = e.matches
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  stopStageRotation()
})

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

async function loadPacketSettings() {
  try {
    const settings = await $fetch<AdminSettingsResponse>('/api/admin/settings', {
      headers: await authHeaders(),
    })
    packetSettings.value = {
      default_invite_expiration_days: settings.default_invite_expiration_days,
      allowed_upload_mime_types: settings.allowed_upload_mime_types,
      max_upload_bytes: settings.max_upload_bytes,
    }
  } catch {
    packetSettings.value = {
      default_invite_expiration_days: DEFAULT_APP_SETTINGS.default_invite_expiration_days,
      allowed_upload_mime_types: [...DEFAULT_APP_SETTINGS.allowed_upload_mime_types],
      max_upload_bytes: DEFAULT_APP_SETTINGS.max_upload_bytes,
    }
  }
}

function validateIdentity(): boolean {
  const first = firstName.value.trim()
  const last = lastName.value.trim()
  if (!first || !last) {
    error.value = 'First and last name are required.'
    return false
  }
  error.value = null
  return true
}

function displayName() {
  return `${firstName.value.trim()} ${lastName.value.trim()}`.trim()
}

async function createInviteAndCandidate(options?: { requireNames?: boolean }) {
  if (options?.requireNames && !validateIdentity()) {
    throw new Error(error.value || 'First and last name are required.')
  }
  const headers = await authHeaders()
  const first = firstName.value.trim()
  const last = lastName.value.trim()
  const invite = await $fetch<{ id: string; url: string; expires_at: string }>('/api/invites', {
    method: 'POST',
    headers,
    body: {
      ...(first ? { candidate_first_name: first } : {}),
      ...(last ? { candidate_last_name: last } : {}),
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
  return isAllowedConfiguredUpload(
    file.type || 'application/octet-stream',
    file.name,
    packetSettings.value.allowed_upload_mime_types,
  )
}

async function createFromFile(file: File) {
  if (!isAllowedResume(file)) {
    error.value = `Use an enabled resume file type: ${uploadTypeCopy.value}.`
    return
  }
  if (file.size > packetSettings.value.max_upload_bytes) {
    error.value = `File must be ${uploadSizeCopy.value} or smaller.`
    return
  }

  loading.value = true
  loadingKind.value = 'upload'
  error.value = null
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  startStageRotation(isPdf)
  try {
    const { invite, candidateId, copied } = await createInviteAndCandidate()
    const formData = new FormData()
    formData.append('file', file)
    await $fetch(`/api/admin/candidates/${candidateId}/parse`, {
      method: 'POST',
      headers: await authHeaders(),
      body: formData,
    })
    stopStageRotation()
    parseCardStatus.value = 'success'
    parseProgress.value = 100
    parseStage.value = reducedMotion.value ? 'Working…' : 'Resume parsed — opening builder…'
    emit('ready', { candidateId, inviteId: invite.id, url: invite.url, copied })
    emit('close')
  } catch (e: unknown) {
    stopStageRotation()
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
    const { invite, candidateId, copied } = await createInviteAndCandidate({ requireNames: true })
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
      class="w-full rounded-xl bg-white p-6 shadow-xl"
      :class="loadingKind === 'upload' ? 'max-w-lg' : 'max-w-md'"
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

      <template v-else-if="!path">
        <h2 id="new-packet-title" class="text-lg font-semibold text-slate-900">New candidate packet</h2>

        <div class="mt-4 space-y-2" role="list">
          <button
            type="button"
            role="listitem"
            class="w-full rounded-lg border-2 border-accent-500 bg-accent-500/15 px-4 py-3 text-left transition hover:bg-accent-500/25 disabled:opacity-50"
            :disabled="loading"
            @click="selectPath('link')"
          >
            <span class="block text-sm font-semibold text-brand-900">Send candidate link</span>
            <span class="mt-0.5 block text-xs text-slate-600">
              Create a self-service upload link · {{ expirationCopy }}
            </span>
          </button>

          <button
            type="button"
            role="listitem"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            :disabled="loading"
            @click="selectPath('upload')"
          >
            <span class="block text-sm font-semibold text-slate-900">Upload resume</span>
            <span class="mt-0.5 block text-xs text-slate-600">
              Drop PDF/Word or browse to parse automatically
            </span>
          </button>

          <button
            type="button"
            role="listitem"
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            :disabled="loading"
            @click="selectPath('scratch')"
          >
            <span class="block text-sm font-semibold text-slate-900">Start from scratch</span>
            <span class="mt-0.5 block text-xs text-slate-600">
              Open a blank packet in the builder
            </span>
          </button>
        </div>

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

      <template v-else>
        <h2 id="new-packet-title" class="text-lg font-semibold text-slate-900">{{ detailTitle }}</h2>

        <div
          v-if="path === 'link'"
          class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
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

        <div :class="path === 'link' ? 'mt-5' : 'mt-4'">
          <template v-if="path === 'link'">
            <button
              type="button"
              class="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
              :disabled="loading"
              @click="onSendLinkPath"
            >
              {{ loadingKind === 'link' ? 'Creating…' : 'Create & copy candidate link' }}
            </button>
            <p class="mt-1.5 text-xs text-slate-500">{{ expirationCopy }}</p>
          </template>

          <template v-else-if="path === 'upload'">
            <input
              ref="fileInputRef"
              type="file"
              :accept="acceptAttr"
              class="hidden"
              :disabled="loading"
              @change="onFileInput"
            >

            <div
              v-if="loadingKind === 'upload'"
              class="rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/60 px-3 py-4"
              :class="!reducedMotion ? 'parse-active' : ''"
            >
              <IntakeProcessingCard
                mode="parse"
                :status="parseCardStatus"
                :message="uploadParseMessage"
                :progress="parseProgress"
                :reduced-motion="reducedMotion"
                show-keep-tab-open
              />
            </div>

            <div
              v-else
              class="rounded-lg border-2 border-dashed px-4 py-6 text-center transition"
              :class="dragOver
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-300 bg-white hover:border-slate-400'"
              role="button"
              tabindex="0"
              @dragover="onDragOver"
              @dragleave="dragOver = false"
              @drop="onDrop"
              @click="chooseFile"
              @keydown.enter.prevent="chooseFile"
              @keydown.space.prevent="chooseFile"
            >
              <p class="text-sm text-slate-700">Drop resume here or click to browse</p>
              <p class="mt-1 text-xs text-slate-500">{{ uploadTypeCopy }} · Max {{ uploadSizeCopy }}</p>
            </div>
          </template>

          <template v-else>
            <button
              type="button"
              class="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
              :disabled="loading"
              @click="onScratchPath"
            >
              {{ loadingKind === 'scratch' ? 'Creating…' : 'Start from scratch' }}
            </button>
          </template>
        </div>

        <p v-if="error" class="mt-4 text-sm text-red-600" role="alert">{{ error }}</p>
        <div class="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            :disabled="loading"
            @click="goBackToChoose"
          >
            Back
          </button>
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

<style scoped>
.parse-active {
  animation: parse-pulse 2s ease-in-out infinite;
}

@keyframes parse-pulse {
  0%,
  100% {
    border-color: rgb(147 197 253);
    background-color: rgb(239 246 255 / 0.6);
  }
  50% {
    border-color: rgb(59 130 246);
    background-color: rgb(219 234 254 / 0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .parse-active {
    animation: none;
  }
}
</style>
