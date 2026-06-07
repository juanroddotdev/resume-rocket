<script setup lang="ts">
import { REPLACE_RESUME_CONFIRM } from '~/utils/intakeDraft'

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
}>()

const { intakeHeaders } = useIntakeInvite()
const parsing = ref(false)
const parseStage = ref('')
const error = ref<string | null>(null)
const dragOver = ref(false)
const reducedMotion = ref(false)

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

  stageTimer = setInterval(() => {
    stageIndex++
    if (stageIndex < stageList.length) {
      parseStage.value = stageList[stageIndex]!
    } else {
      const longIdx = (stageIndex - stageList.length) % LONG_WAIT_MESSAGES.length
      parseStage.value = LONG_WAIT_MESSAGES[longIdx]!
    }
  }, STAGE_INTERVAL_MS)
}

async function handleFile(file: File) {
  if (isBusy.value) return

  if (props.hasExistingData && import.meta.client && !confirm(REPLACE_RESUME_CONFIRM)) {
    return
  }

  error.value = null
  parsing.value = true

  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  startStageRotation(isPdf)

  const formData = new FormData()
  formData.append('file', file)
  if (props.candidateId) formData.append('candidateId', props.candidateId)

  try {
    const result = await $fetch<Record<string, unknown>>('/api/parse', {
      method: 'POST',
      headers: intakeHeaders(),
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
    parseStage.value = ''
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
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">
      PDF or Word (.docx), max 10MB. Data is used for placement only and is not sold.
    </p>
    <div
      class="rounded-xl border-2 border-dashed px-4 py-10 text-center transition"
      :class="[
        isBusy
          ? 'pointer-events-none border-brand-300 bg-brand-50/60'
          : dragOver
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-slate-50',
        parsing && !reducedMotion ? 'parse-active' : '',
      ]"
      :aria-busy="parsing"
      role="status"
      :aria-live="parsing ? 'polite' : 'off'"
      @dragover="onDragOver"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <div v-if="parsing" class="flex flex-col items-center gap-3">
        <div
          v-if="!reducedMotion"
          class="relative h-10 w-10"
          aria-hidden="true"
        >
          <div class="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-40" />
          <div class="relative h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
        <p class="text-sm font-medium text-brand-700">
          {{ displayStage }}
        </p>
        <p v-if="!reducedMotion" class="text-xs text-slate-500">
          Please keep this tab open
        </p>
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
