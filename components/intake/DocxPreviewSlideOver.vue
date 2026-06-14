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
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="preview-slideover absolute inset-0 z-30 flex flex-col rounded-xl bg-white shadow-[-12px_0_32px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
    :class="open ? 'translate-x-0' : 'pointer-events-none translate-x-full'"
    :aria-hidden="!open"
  >
    <header class="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-600">Presentation mode</p>
        <h2 class="truncate text-lg font-semibold text-slate-900">Preview your packet</h2>
        <p class="mt-0.5 text-sm text-slate-600">
          Review the generated VMS document before download.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        @click="emit('close')"
      >
        Back to edit
      </button>
    </header>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
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
        class="min-h-0 flex-1"
        :candidate-id="candidateId"
        :headers="headers"
        :reload-token="reloadToken"
      />
    </div>

    <footer class="flex shrink-0 gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
      <button
        type="button"
        class="flex-1 rounded-lg border border-slate-300 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
        @click="emit('close')"
      >
        Make changes
      </button>
      <button
        type="button"
        class="flex-1 rounded-lg bg-brand-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        :disabled="submitting || preparing || !candidateId"
        @click="emit('download')"
      >
        {{ submitting ? 'Preparing download…' : downloadLabel }}
      </button>
    </footer>
  </div>
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
