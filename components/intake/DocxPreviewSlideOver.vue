<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  candidateId?: string
  headers?: Record<string, string>
  reloadToken?: number | string
  preparing?: boolean
  prepareError?: string | null
  submitting?: boolean
  downloadLabel?: string
  candidateName?: string
}>(), {
  headers: () => ({}),
  reloadToken: 0,
  downloadLabel: 'Download draft packet',
})

const emit = defineEmits<{
  close: []
  download: []
}>()

const hasOpened = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) hasOpened.value = true
    if (import.meta.client) {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }
  },
  { immediate: true },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      class="preview-slideover fixed inset-3 z-[100] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none sm:inset-4"
      :class="open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'"
      :aria-hidden="!open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="packet-preview-title"
    >
      <header class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <h2 id="packet-preview-title" class="min-w-0 truncate text-base font-semibold text-slate-900 sm:text-lg">
          {{ candidateName || 'Candidate' }} <span class="font-normal text-slate-500">— Preview</span>
        </h2>
        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:px-4"
            @click="emit('close')"
          >
            Make changes
          </button>
          <button
            type="button"
            class="rounded-lg bg-accent-500 px-3 py-2 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 sm:px-4"
            :disabled="submitting || preparing || !candidateId"
            @click="emit('download')"
          >
            {{ submitting ? 'Preparing…' : downloadLabel }}
          </button>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-200 p-3 sm:p-4">
        <p
          v-if="prepareError"
          class="mb-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          {{ prepareError }} Preview uses your last saved draft.
        </p>

        <div
          v-if="preparing"
          class="flex flex-1 items-center justify-center text-sm text-slate-500"
          role="status"
        >
          Saving and generating preview…
        </div>
        <div
          v-else-if="!candidateId"
          class="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-amber-950"
          role="status"
        >
          <p class="font-medium">Preview is not ready yet</p>
          <p class="text-slate-600">Save the draft first, then try preview again.</p>
          <button type="button" class="mt-2 underline" @click="emit('close')">Back to edit</button>
        </div>
        <DocxPreviewViewer
          v-else-if="hasOpened"
          fill
          immersive
          class="min-h-0 flex-1"
          :candidate-id="candidateId"
          :headers="headers"
          :reload-token="reloadToken"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.preview-slideover[aria-hidden='true'] {
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .preview-slideover {
    transition: none;
  }
}
</style>
