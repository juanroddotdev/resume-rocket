<script setup lang="ts">
const emit = defineEmits<{
  parsed: [data: Record<string, unknown>]
  parseFailed: []
  manual: []
}>()

const props = defineProps<{
  candidateId?: string | null
  disabled?: boolean
}>()

const { intakeHeaders } = useIntakeInvite()
const parsing = ref(false)
const parseStage = ref('')
const error = ref<string | null>(null)
const dragOver = ref(false)
const reducedMotion = ref(false)

onMounted(() => {
  if (!import.meta.client) return
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = mq.matches
  mq.addEventListener('change', (e) => {
    reducedMotion.value = e.matches
  })
})

const isBusy = computed(() => parsing.value || props.disabled)

const displayStage = computed(() => {
  if (!parsing.value) return ''
  if (reducedMotion.value) return 'Working…'
  return parseStage.value
})

async function handleFile(file: File) {
  if (isBusy.value) return

  error.value = null
  parsing.value = true
  parseStage.value = 'Uploading file…'

  const formData = new FormData()
  formData.append('file', file)
  if (props.candidateId) formData.append('candidateId', props.candidateId)

  try {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    parseStage.value = isPdf ? 'Reading and scanning document…' : 'Extracting fields…'
    const result = await $fetch<Record<string, unknown>>('/api/parse', {
      method: 'POST',
      headers: intakeHeaders(),
      body: formData,
    })

    parseStage.value = 'Saving…'

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
        isBusy ? 'pointer-events-none border-slate-200 bg-slate-100' : dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50',
      ]"
      :aria-busy="parsing"
      @dragover="onDragOver"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <div v-if="parsing" class="flex flex-col items-center gap-3">
        <div
          v-if="!reducedMotion"
          class="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
          aria-hidden="true"
        />
        <p class="text-sm font-medium text-brand-700">
          {{ displayStage }}
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
