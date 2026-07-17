<!--
  Archived 2026-07: compact "Re-upload resume" control for admin sidebar.
  Removed from pages/admin.vue — initial upload uses New candidate packet modal;
  replace/re-parse can use intake link or be reintroduced elsewhere if needed.
  Was wired via FileDropZone variant="admin-sidebar".
-->
<script setup lang="ts">
defineProps<{
  parsing?: boolean
  error?: string | null
  disabled?: boolean
  displayStage?: string
  parseCardStatus?: 'active' | 'success'
  parseProgress?: number
  reducedMotion?: boolean
}>()

const emit = defineEmits<{
  chooseFile: []
}>()
</script>

<template>
  <div class="space-y-2">
    <div v-if="parsing" class="rounded-lg border border-brand-200 bg-brand-50/60 p-3">
      <IntakeProcessingCard
        mode="parse"
        :status="parseCardStatus || 'active'"
        :message="displayStage || 'Working…'"
        :progress="parseProgress || 0"
        :reduced-motion="reducedMotion"
      />
    </div>
    <button
      v-else
      type="button"
      class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      :disabled="disabled"
      @click="emit('chooseFile')"
    >
      Re-upload resume
    </button>
    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
  </div>
</template>
