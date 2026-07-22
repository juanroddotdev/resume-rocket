<script setup lang="ts">
import { fetchPreviewDocx } from '~/utils/fetchPreviewDocx'

const props = defineProps<{
  candidateId: string
  headers?: Record<string, string>
  /** Bump to refetch after draft save or re-open preview. */
  reloadToken?: number | string
  /** Fill available height (slide-over) vs embedded max height. */
  fill?: boolean
  /** Full workspace preview with a darker canvas and edge-to-edge scroll area. */
  immersive?: boolean
}>()

const bodyContainer = ref<HTMLElement | null>(null)
const styleContainer = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let renderGeneration = 0

async function waitForContainers() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await nextTick()
    if (bodyContainer.value) return true
  }
  return Boolean(bodyContainer.value)
}

async function loadPreview() {
  if (!import.meta.client || !props.candidateId) return

  const hasContainers = await waitForContainers()
  if (!hasContainers || !bodyContainer.value) {
    error.value = 'Preview could not initialize. Try again.'
    return
  }

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
    if (generation !== renderGeneration || !bodyContainer.value) return

    const { renderAsync } = await import('docx-preview')
    await renderAsync(
      buffer,
      bodyContainer.value,
      styleContainer.value ?? undefined,
      {
        className: 'docx-preview',
        inWrapper: true,
        // Keep Word page geometry so preview matches printed/download layout.
        ignoreWidth: false,
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
    if (props.candidateId) loadPreview()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  renderGeneration++
  bodyContainer.value?.replaceChildren()
  styleContainer.value?.replaceChildren()
})
</script>

<template>
  <div
    role="region"
    aria-labelledby="docx-preview-heading"
    class="flex flex-col overflow-hidden"
    :class="[
      fill ? 'h-full min-h-0' : '',
      immersive ? 'bg-slate-200' : 'rounded-lg border border-slate-200 bg-white',
    ]"
  >
    <p id="docx-preview-heading" class="sr-only">VMS packet document preview</p>

    <div
      v-if="error && !loading"
      class="space-y-3 border-b border-red-100 bg-red-50 px-4 py-6 text-center"
      role="alert"
    >
      <p class="text-sm text-red-800">{{ error }}</p>
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        @click="loadPreview"
      >
        Retry
      </button>
    </div>

    <div
      class="relative overflow-auto"
      :class="[
        immersive ? 'bg-slate-200 px-2 py-4' : 'bg-slate-100 px-2 py-3',
        fill ? 'min-h-0 flex-1' : 'max-h-[min(70vh,720px)] min-h-[12rem]',
      ]"
    >
      <div ref="styleContainer" class="docx-preview-styles" aria-hidden="true" />
      <div ref="bodyContainer" class="docx-preview-body mx-auto w-max max-w-none" />

      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-slate-500"
        role="status"
      >
        Generating preview…
      </div>
    </div>
  </div>
</template>

<style scoped>
.docx-preview-body :deep(.docx-wrapper) {
  margin: 0 auto;
  background: transparent;
  padding: 0;
}

.docx-preview-body :deep(section.docx) {
  box-sizing: border-box;
  margin: 0 auto 0.75rem;
  background: white;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.12), 0 4px 12px rgb(15 23 42 / 0.06);
}

.docx-preview-body :deep(section.docx:last-child) {
  margin-bottom: 0;
}

/*
 * docx-preview paints bullets as list-item + list-style-position:inside, so wrapped
 * lines align under the marker. Force a Word-style hanging indent (template numbering
 * uses left=360 / hanging=360 twips = 18pt) so wrap aligns with the first text letter.
 */
.docx-preview-body :deep(p[class*='docx-num-']) {
  display: block;
  list-style: none;
  margin-inline-start: 18pt !important;
  text-indent: -18pt !important;
}

/*
 * docx-preview paints list markers via p.docx-num-*:before.
 * Oversized ● glyphs (no Word sizing) looked huge in-app; template now uses • @ 10pt.
 * Keep a light ceiling if numbering styles are missing.
 */
.docx-preview-body :deep(p[class*='docx-num-']::before) {
  font-size: 10pt;
  line-height: 1;
  display: inline-block;
  width: 18pt;
  text-indent: 0;
}
</style>
