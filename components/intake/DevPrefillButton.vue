<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  prefill: []
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
      Skip upload — load a partial parse fixture (missing license, EMR, employer dates, graduation year, etc.).
    </p>
    <button
      type="button"
      class="mt-3 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
      :disabled="disabled"
      @click="emit('prefill')"
    >
      Load dev fixture
    </button>
  </div>
</template>
