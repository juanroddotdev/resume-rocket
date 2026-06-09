<script setup lang="ts">
const props = defineProps<{
  status: 'idle' | 'saving' | 'saved' | 'error'
  /** Show persistent “Saved” when idle (e.g. Step 0 after draft created). */
  showSavedIdle?: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()

const showSavedCheck = ref(false)
let savedTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.status,
  (status) => {
    if (savedTimer) {
      clearTimeout(savedTimer)
      savedTimer = null
    }
    if (status === 'saved') {
      showSavedCheck.value = true
      savedTimer = setTimeout(() => {
        showSavedCheck.value = false
        savedTimer = null
      }, 2000)
    } else {
      showSavedCheck.value = false
    }
  },
)

onBeforeUnmount(() => {
  if (savedTimer) clearTimeout(savedTimer)
})

const showSavedLabel = computed(
  () => showSavedCheck.value || (props.showSavedIdle && props.status === 'idle'),
)

const visible = computed(
  () => props.status === 'saving' || props.status === 'error' || showSavedLabel.value,
)
</script>

<template>
  <div
    v-if="visible"
    class="inline-flex min-w-[5.5rem] items-center justify-end gap-1 text-xs text-slate-500"
    aria-live="polite"
    aria-atomic="true"
  >
    <span v-if="status === 'saving'" class="inline-flex items-center gap-1">
      <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden="true" />
      Saving…
    </span>
    <span v-else-if="showSavedLabel" class="inline-flex items-center gap-1 text-brand-700">
      <span aria-hidden="true">✓</span>
      Saved
    </span>
    <span v-else-if="status === 'error'" class="text-red-600">
      Save failed —
      <button type="button" class="underline" @click="emit('retry')">Retry</button>
    </span>
  </div>
</template>
