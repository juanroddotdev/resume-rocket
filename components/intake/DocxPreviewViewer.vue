<script setup lang="ts">
import { fetchPreviewDocx } from '~/utils/fetchPreviewDocx'

const props = defineProps<{
  candidateId: string
  headers?: Record<string, string>
  /** Bump to refetch after draft save or re-open preview. */
  reloadToken?: number | string
}>()

const bodyContainer = ref<HTMLElement | null>(null)
const styleContainer = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let renderGeneration = 0

async function loadPreview() {
  if (!props.candidateId || !bodyContainer.value) return

  const generation = ++renderGeneration
  loading.value = true
  error.value = null
  bodyContainer.value.innerHTML = ''
  if (styleContainer.value) styleContainer.value.innerHTML = ''

  try {
    const buffer = await fetchPreviewDocx({
      body: { id: props.candidateId },
      headers: props.headers,
    })
    if (generation !== renderGeneration) return

    const { renderAsync } = await import('docx-preview')
    await renderAsync(
      buffer,
      bodyContainer.value,
      styleContainer.value ?? undefined,
      {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: true,
        breakPages: true,
      },
    )
  } catch (e) {
    if (generation !== renderGeneration) return
    error.value = e instanceof Error ? e.message : 'Could not load preview.'
  } finally {
    if (generation === renderGeneration) loading.value = false
  }
}

watch(
  () => [props.candidateId, props.reloadToken] as const,
  () => {
    if (import.meta.client && props.candidateId) {
      nextTick(() => loadPreview())
    }
  },
)

onMounted(() => {
  if (props.candidateId) loadPreview()
})

onBeforeUnmount(() => {
  renderGeneration++
  bodyContainer.value?.replaceChildren()
  styleContainer.value?.replaceChildren()
})
</script>

<template>
  <ClientOnly>
    <div
      role="region"
      aria-labelledby="docx-preview-heading"
      class="overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <p id="docx-preview-heading" class="sr-only">VMS packet document preview</p>

      <div v-if="loading" class="px-4 py-12 text-center text-sm text-slate-500" role="status">
        Generating preview…
      </div>

      <div
        v-else-if="error"
        class="space-y-3 px-4 py-8 text-center"
        role="alert"
      >
        <p class="text-sm text-red-800">{{ error }}</p>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          @click="loadPreview"
        >
          Retry
        </button>
      </div>

      <div
        v-show="!loading && !error"
        class="max-h-[min(70vh,720px)] overflow-auto bg-slate-100 p-3"
      >
        <div ref="styleContainer" class="docx-preview-styles" aria-hidden="true" />
        <div ref="bodyContainer" class="docx-preview-body mx-auto max-w-full bg-white shadow-sm" />
      </div>
    </div>
    <template #fallback>
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Loading preview…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.docx-preview-styles :deep(.docx-wrapper) {
  margin: 0 auto;
}
</style>
