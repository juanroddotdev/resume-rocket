<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number
  modelValue?: string
  editable?: boolean
  placeholder?: string
  suffix?: string
  fromDatabase?: boolean
  inputId?: string
  inputClass?: string | Record<string, unknown> | Array<string | Record<string, unknown>>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div
    class="rounded-xl bg-slate-50 p-2.5"
    :class="fromDatabase ? 'metric-tile-db-sourced' : null"
  >
    <template v-if="editable">
      <label class="block" :for="inputId">
        <p class="text-xs uppercase tracking-wide text-slate-500">
          {{ label }}
        </p>
        <input
          :id="inputId"
          :value="modelValue ?? ''"
          type="text"
          :placeholder="placeholder"
          :class="[
            'mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 rounded',
            inputClass,
          ]"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        >
      </label>
    </template>
    <template v-else>
      <p class="text-xs uppercase tracking-wide text-slate-500">
        {{ label }}
      </p>
      <p class="text-sm font-semibold text-slate-900">
        {{ value }}<span v-if="suffix" class="font-normal text-slate-600">{{ suffix }}</span>
      </p>
    </template>
  </div>
</template>
