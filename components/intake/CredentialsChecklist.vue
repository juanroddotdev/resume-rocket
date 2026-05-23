<script setup lang="ts">
const props = defineProps<{
  credentials: Record<string, boolean>
  licenseNumber: string
  licenseState: string
  certKeys: readonly string[]
}>()

const emit = defineEmits<{
  'update:credentials': [value: Record<string, boolean>]
  'update:licenseNumber': [value: string]
  'update:licenseState': [value: string]
}>()

function toggle(cert: string) {
  const next = { ...props.credentials, [cert]: !props.credentials[cert] }
  emit('update:credentials', next)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <p class="mb-2 text-sm font-medium text-slate-700">Certifications</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cert in certKeys"
          :key="cert"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-medium transition"
          :class="credentials[cert] ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'"
          @click="toggle(cert)"
        >
          {{ cert }}
        </button>
      </div>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">License number</label>
      <input
        :value="licenseNumber"
        type="text"
        class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
        @input="emit('update:licenseNumber', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">License state</label>
      <input
        :value="licenseState"
        type="text"
        maxlength="2"
        placeholder="e.g. CA"
        class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base uppercase"
        @input="emit('update:licenseState', ($event.target as HTMLInputElement).value)"
      >
    </div>
  </div>
</template>
