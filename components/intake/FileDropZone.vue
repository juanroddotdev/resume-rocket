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

async function handleFile(file: File) {
  error.value = null
  parsing.value = true
  parseStage.value = 'Reading file…'

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

    if (result.parse_failed) {
      error.value = String(result.parse_error || 'Could not read enough information from your resume')
      emit('parseFailed')
    } else {
      emit('parsed', result)
    }
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Upload failed'
    emit('parseFailed')
  } finally {
    parsing.value = false
    parseStage.value = ''
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function onInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-slate-500">
      PDF or Word (.docx), max 10MB. Data is used for placement only and is not sold.
    </p>
    <div
      class="rounded-xl border-2 border-dashed px-4 py-10 text-center transition"
      :class="dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <p v-if="parsing" class="text-sm font-medium text-brand-700">
        {{ parseStage }}
      </p>
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
