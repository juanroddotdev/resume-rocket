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
    <p
      v-if="hasDocumentScan"
      class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
    >
      We scanned your PDF visually — please review all fields.
    </p>
    <p
      v-if="hasPartialParse"
      class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      Some fields used basic detection — please review.
    </p>
    <p
      v-if="showFieldsFound && fieldsFound > 0 && !hasDocumentScan && !hasPartialParse"
      class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
    >
      We prefilled {{ fieldsFound }} field{{ fieldsFound === 1 ? '' : 's' }} from your resume.
    </p>
    <p
      v-else-if="showFieldsFound && fieldsFound > 0 && (hasDocumentScan || hasPartialParse)"
      class="text-xs text-slate-600"
    >
      We prefilled {{ fieldsFound }} field{{ fieldsFound === 1 ? '' : 's' }} from your resume.
    </p>
  </div>
</template>
