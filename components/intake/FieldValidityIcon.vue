<script setup lang="ts">
const props = defineProps<{
  valid: boolean
  touched: boolean
}>()
</script>

<template>
  <span
    v-if="touched && valid"
    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 motion-safe:transition-opacity"
    aria-hidden="true"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-4">
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clip-rule="evenodd"
      />
    </svg>
  </span>
</template>
