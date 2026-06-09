<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  suffix?: string
}>()
</script>

<template>
  <div class="rounded-xl bg-slate-50 p-2.5">
    <p class="text-xs uppercase tracking-wide text-slate-500">
      {{ label }}
    </p>
    <p class="text-sm font-semibold text-slate-900">
      {{ value }}<span v-if="suffix" class="font-normal text-slate-600">{{ suffix }}</span>
    </p>
  </div>
</template>
