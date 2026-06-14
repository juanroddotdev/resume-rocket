<script setup lang="ts">
import { REPLACE_RESUME_CONFIRM } from '~/utils/intakeDraft'
import { parseStageProgress } from '~/utils/intakeProcessing'

const emit = defineEmits<{
  parsed: [data: Record<string, unknown>]
  parseFailed: []
  manual: []
}>()

const props = defineProps<{
  candidateId?: string | null
  disabled?: boolean
  /** When true, confirm before starting a new parse (wizard already has data). */
  hasExistingData?: boolean
  /** Override parse endpoint (admin builder). */
  parseUrl?: string
  /** Extra headers for parse request (admin bearer auth). */
  authHeaders?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>)
  /** Admin-facing copy tweaks */
  variant?: 'intake' | 'admin' | 'admin-sidebar'
}>()

const { intakeHeaders } = useIntakeInvite()
const parsing = ref(false)
const parseStage = ref('')
const parseCardStatus = ref<'active' | 'success'>('active')
const parseProgress = ref(0)
const error = ref<string | null>(null)
const dragOver = ref(false)
const reducedMotion = ref(false)
const sidebarFileInputRef = ref<HTMLInputElement | null>(null)

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
const PARSE_SUCCESS_FLASH_MS = 400

let stageTimer: ReturnType<typeof setInterval> | null = null
let stageIndex = 0
let stageList: readonly string[] = PDF_STAGES

onMounted(() => {
  if (!import.meta.client) return
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = mq.matches
  mq.addEventListener('change', (e) => {
    reducedMotion.value = e.matches
  })
})

onUnmounted(() => {
  stopStageRotation()
})

const isBusy = computed(() => parsing.value || props.disabled)

const displayStage = computed(() => {
  if (!parsing.value) return ''
  if (reducedMotion.value) return 'Working…'
  return parseStage.value
})

function updateParseProgress() {
  parseProgress.value = parseStageProgress(stageIndex, stageList.length)
}

function stopStageRotation() {
  if (stageTimer) {
    clearInterval(stageTimer)
    stageTimer = null
  }
}

function startStageRotation(isPdf: boolean) {
  stopStageRotation()
  stageList = isPdf ? PDF_STAGES : DOCX_STAGES
  stageIndex = 0
  parseStage.value = stageList[0]!
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function handleFile(file: File) {
  if (isBusy.value) return

  if (props.hasExistingData && import.meta.client && !confirm(REPLACE_RESUME_CONFIRM)) {
    return
  }

  error.value = null
  parsing.value = true
  parseCardStatus.value = 'active'
  parseProgress.value = 10

  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  startStageRotation(isPdf)

  const formData = new FormData()
  formData.append('file', file)
  if (props.candidateId) formData.append('candidateId', props.candidateId)

  try {
    const extraHeaders = typeof props.authHeaders === 'function'
      ? await props.authHeaders()
      : (props.authHeaders ?? intakeHeaders())
    const result = await $fetch<Record<string, unknown>>(props.parseUrl || '/api/parse', {
      method: 'POST',
      headers: extraHeaders,
      body: formData,
    })

    stopStageRotation()
    parseStage.value = reducedMotion.value
      ? 'Working…'
      : result.document_scan
        ? 'Saving — we scanned your PDF visually…'
        : result.partial_parse
          ? 'Saving — some fields need your review…'
          : 'Saving…'

    if (result.parse_failed) {
      error.value = String(result.parse_error || 'Could not read enough information from your resume')
      emit('parseFailed')
    } else {
      parseCardStatus.value = 'success'
      parseProgress.value = 100
      parseStage.value = reducedMotion.value
        ? 'Working…'
        : 'Your fields are ready for review.'
      if (!reducedMotion.value) {
        await sleep(PARSE_SUCCESS_FLASH_MS)
      }
      emit('parsed', result)
    }
  } catch (e: unknown) {
    const err = e as { status?: number; statusCode?: number; data?: { statusMessage?: string }; message?: string }
    const status = err.status ?? err.statusCode
    if (status === 429) {
      error.value =
        err.data?.statusMessage
        || 'Too many upload attempts. Wait a few minutes and try again, or continue manually below.'
    } else {
      error.value = err.data?.statusMessage || err.message || 'Upload failed'
    }
    emit('parseFailed')
  } finally {
    stopStageRotation()
    parsing.value = false
    parseCardStatus.value = 'active'
    parseStage.value = ''
    parseProgress.value = 0
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (isBusy.value) return
  dragOver.value = true
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  if (isBusy.value) return
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
  input.value = ''
}

function chooseSidebarFile() {
  sidebarFileInputRef.value?.click()
}
</script>

<template>
  <div :class="props.variant === 'admin-sidebar' ? 'space-y-2' : 'space-y-4'">
    <template v-if="props.variant === 'admin-sidebar'">
      <input
        ref="sidebarFileInputRef"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        class="hidden"
        :disabled="disabled"
        @change="onInput"
      >
      <div v-if="parsing" class="rounded-lg border border-brand-200 bg-brand-50/60 p-3">
        <IntakeProcessingCard
          mode="parse"
          :status="parseCardStatus"
          :message="displayStage"
          :progress="parseProgress"
          :reduced-motion="reducedMotion"
        />
      </div>
      <button
        v-else
        type="button"
        class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        :disabled="isBusy"
        @click="chooseSidebarFile"
      >
        Re-upload resume
      </button>
      <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
    </template>

    <template v-else>
      <p class="text-xs text-slate-500">
      PDF or Word (.docx), max 10MB.
      {{ props.variant === 'admin' ? ' Upload the resume the candidate emailed you.' : ' Data is used for placement only and is not sold.' }}
    </p>
    <div
      class="rounded-xl border-2 border-dashed px-4 py-6 text-center transition"
      :class="[
        isBusy
          ? 'pointer-events-none border-brand-300 bg-brand-50/60'
          : dragOver
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-slate-50',
        parsing && !reducedMotion ? 'parse-active' : '',
      ]"
      @dragover="onDragOver"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <div v-if="parsing">
        <IntakeProcessingCard
          mode="parse"
          :status="parseCardStatus"
          :message="displayStage"
          :progress="parseProgress"
          :reduced-motion="reducedMotion"
          show-keep-tab-open
        />
      </div>
      <template v-else>
        <p class="text-sm text-slate-700">Drop your resume here</p>
        <label class="mt-3 inline-block cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          Choose file
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            class="hidden"
            :disabled="disabled"
            @change="onInput"
          >
        </label>
      </template>
    </div>
    <p v-if="error" class="text-sm text-red-600">
      {{ error }}
    </p>
    <button
      v-if="error"
      type="button"
      class="w-full rounded-lg border border-slate-300 py-3 text-sm font-medium"
      @click="emit('manual')"
    >
      Continue manually
    </button>
    </template>
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
