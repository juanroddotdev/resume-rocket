<script setup lang="ts">
import type { ParseMeta } from '~/composables/useCandidateForm'

const props = defineProps<{
  meta: ParseMeta | null
  showFieldsFound?: boolean
}>()

const hasDocumentScan = computed(() => Boolean(props.meta?.document_scan))
const hasPartialParse = computed(() => Boolean(props.meta?.partial_parse))
const fieldsFound = computed(() => props.meta?.fields_found ?? 0)
const visible = computed(() => hasDocumentScan.value || hasPartialParse.value || (props.showFieldsFound && fieldsFound.value > 0))
</script>

<template>
  <div v-if="visible" class="space-y-2">
    <div
      v-if="hasDocumentScan"
      class="flex gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
    >
      <span class="shrink-0 text-base leading-5" aria-hidden="true">📄</span>
      <p>
        <span class="font-medium">Visual scan</span> — We read your PDF visually. Please review all fields.
      </p>
    </div>
    <div
      v-if="hasPartialParse"
      class="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <span class="shrink-0 text-base leading-5" aria-hidden="true">⚠️</span>
      <p>
        <span class="font-medium">Partial match</span> — Some fields used basic detection. Please review.
      </p>
    </div>
    <div
      v-if="showFieldsFound && fieldsFound > 0 && !hasDocumentScan && !hasPartialParse"
      class="flex gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
    >
      <span class="shrink-0 text-base leading-5" aria-hidden="true">✨</span>
      <p>
        We prefilled {{ fieldsFound }} field{{ fieldsFound === 1 ? '' : 's' }} from your resume.
      </p>
    </div>
    <p
      v-else-if="showFieldsFound && fieldsFound > 0 && (hasDocumentScan || hasPartialParse)"
      class="pl-1 text-xs text-slate-600"
    >
      We prefilled {{ fieldsFound }} field{{ fieldsFound === 1 ? '' : 's' }} from your resume.
    </p>
  </div>
</template>
