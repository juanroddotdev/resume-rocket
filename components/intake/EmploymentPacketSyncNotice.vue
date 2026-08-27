<script setup lang="ts">
defineProps<{
  message?: string | null
}>()
</script>

<template>
  <p
    v-if="message"
    class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
    role="status"
    aria-live="polite"
  >
    <span class="font-medium">Saved</span>
    <span aria-hidden="true"> · </span>
    {{ message }}
  </p>
</template>
