<script setup lang="ts">
import type { IntakePreviewMode } from '~/composables/useIntakePreviewMode'

const props = defineProps<{
  modelValue: IntakePreviewMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: IntakePreviewMode]
}>()

const isAdmin = computed(() => props.modelValue === 'admin')

const ariaLabel = computed(() =>
  isAdmin.value
    ? 'Admin preview on — click for client view'
    : 'Client view — click for admin preview',
)

function toggle() {
  emit('update:modelValue', isAdmin.value ? 'client' : 'admin')
}
</script>

<template>
  <button
    type="button"
    class="absolute right-0 top-0 z-40 rounded-l-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm transition-colors"
    :class="isAdmin
      ? 'bg-brand-600 text-white'
      : 'bg-slate-200 text-slate-600'"
    :aria-pressed="isAdmin"
    :aria-label="ariaLabel"
    @click="toggle"
  >
    Admin
  </button>
</template>
