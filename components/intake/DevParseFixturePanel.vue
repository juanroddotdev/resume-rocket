<script setup lang="ts">
defineProps<{
  disabled?: boolean
  /** Admin builder vs intake upload step */
  context?: 'intake' | 'admin'
}>()

const emit = defineEmits<{
  prefill: [mode: 'partial' | 'complete']
}>()

const isDev = import.meta.dev
</script>

<template>
  <div
    v-if="isDev"
    class="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3"
  >
    <p class="text-xs font-semibold uppercase tracking-wide text-amber-800">
      Dev only
    </p>
    <p class="mt-1 text-sm text-amber-950">
      <template v-if="context === 'admin'">
        Skip upload — load synthetic parse data into the builder (no Gemini, no file storage).
      </template>
      <template v-else>
        Skip upload — load synthetic parse fixtures without a resume file.
      </template>
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        :disabled="disabled"
        @click="emit('prefill', 'partial')"
      >
        Partial fixture
      </button>
      <button
        type="button"
        class="rounded-lg border border-amber-500 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-200 disabled:opacity-50"
        :disabled="disabled"
        @click="emit('prefill', 'complete')"
      >
        Complete fixture
      </button>
    </div>
    <p class="mt-2 text-xs text-amber-900/80">
      Partial — gap review practice (missing license, EMR, employer fields).
      Complete — DOCX smoke (aligned with test-docx-mapping).
    </p>
  </div>
</template>
