<script setup lang="ts">
import type { EmployerLinkAdvisory, MissingTemplateField } from '~/utils/vmsGapReview'

const props = withDefaults(defineProps<{
  missing: MissingTemplateField[]
  advisories?: EmployerLinkAdvisory[]
  submitting: boolean
  allowIncompleteSubmit?: boolean
  candidateId?: string
  previewHeaders?: Record<string, string>
  previewReloadToken?: number | string
  previewLoading?: boolean
  previewSaveError?: string | null
  active?: boolean
  /** When false, preview opens externally (e.g. slide-over) via the preview event. */
  presentPreview?: boolean
}>(), {
  previewHeaders: () => ({}),
  previewReloadToken: 0,
  active: true,
  presentPreview: true,
})

const emit = defineEmits<{
  back: []
  submit: []
  preview: []
  'go-to-field': [payload: { step: number; fieldId: string }]
}>()

const showPreview = ref(false)

watch(
  () => props.active,
  (active) => {
    if (active === false) showPreview.value = false
  },
)

const canPreview = computed(
  () => props.allowIncompleteSubmit || props.missing.length === 0,
)

function onPreviewClick() {
  emit('preview')
  if (props.presentPreview) showPreview.value = true
}

function onBackToEdit() {
  showPreview.value = false
}
</script>

<template>
  <div class="space-y-4">
    <template v-if="!showPreview">
      <h1 class="text-xl font-bold">Review before download</h1>
      <p class="text-sm text-slate-600">
        <template v-if="props.allowIncompleteSubmit">
          Admin preview — review gaps below, then preview your packet before downloading a draft.
        </template>
        <template v-else>
          Fix any missing fields below, then preview your packet to confirm before download.
        </template>
      </p>

      <div
        v-if="missing.length"
        class="rounded-lg border px-3 py-3 text-sm"
        :class="props.allowIncompleteSubmit
          ? 'border-slate-200 bg-slate-50 text-slate-800'
          : 'border-amber-200 bg-amber-50 text-amber-950'"
      >
        <p class="font-medium">
          {{ props.allowIncompleteSubmit ? 'Incomplete fields' : 'Still needed' }} ({{ missing.length }})
        </p>
        <ul class="mt-2 space-y-1">
          <li v-for="field in missing" :key="field.id">
            <button
              type="button"
              class="text-left underline"
              @click="emit('go-to-field', { step: field.step, fieldId: field.id })"
            >
              {{ field.label }}
            </button>
          </li>
        </ul>
      </div>

      <div
        v-if="advisories?.length"
        class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
      >
        <p class="font-medium">Recommended (optional)</p>
        <ul class="mt-2 space-y-1">
          <li v-for="item in advisories" :key="item.id">
            <button
              type="button"
              class="text-left underline"
              @click="emit('go-to-field', { step: item.step, fieldId: item.id })"
            >
              {{ item.label }}
            </button>
          </li>
        </ul>
      </div>

      <p v-if="!missing.length" class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
        All required VMS fields look complete. Preview your packet to confirm before download.
      </p>
      <p
        v-else-if="props.allowIncompleteSubmit"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        Admin view: preview will show blank sections for missing fields above.
      </p>

      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-lg border py-3" @click="emit('back')">Back</button>
        <button
          type="button"
          class="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50"
          :disabled="submitting || previewLoading || !canPreview"
          @click="onPreviewClick"
        >
          {{ previewLoading ? 'Saving…' : 'Preview packet' }}
        </button>
      </div>
    </template>

    <template v-else>
      <h1 class="text-xl font-bold">Preview your packet</h1>
      <p class="text-sm text-slate-600">
        Review your VMS placement packet below. Download when it looks correct.
      </p>

      <p
        v-if="previewSaveError"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        role="status"
      >
        {{ previewSaveError }} Preview uses your last saved draft.
      </p>

      <div v-if="previewLoading" class="py-8 text-center text-sm text-slate-500" role="status">
        Saving your answers…
      </div>
      <div
        v-else-if="!candidateId"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950"
        role="status"
      >
        <p class="font-medium">Preview is not ready yet</p>
        <p class="mt-1">Your draft must be saved before we can generate the document. Go back and try again.</p>
        <button type="button" class="mt-3 underline" @click="onBackToEdit">Make changes</button>
      </div>
      <div v-else id="docx-preview-viewer">
        <DocxPreviewViewer
          :candidate-id="candidateId"
          :headers="previewHeaders"
          :reload-token="previewReloadToken"
        />
      </div>

      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-lg border py-3" @click="onBackToEdit">
          Make changes
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50"
          :disabled="submitting || previewLoading || !candidateId"
          @click="emit('submit')"
        >
          {{
            submitting
              ? 'Preparing your packet…'
              : props.allowIncompleteSubmit
                ? 'Download draft packet'
                : 'Download VMS-Ready Resume'
          }}
        </button>
      </div>
    </template>
  </div>
</template>
