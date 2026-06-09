<script setup lang="ts">
import type { EducationEntry } from '~/types/candidate'

const props = defineProps<{
  modelValue: EducationEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EducationEntry[]]
}>()

function addRow() {
  emit('update:modelValue', [...props.modelValue, {}])
}

function removeRow(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function patchRow(index: number, partial: Partial<EducationEntry>) {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...partial } : row))
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-slate-700">Education</p>
      <button type="button" class="text-sm text-brand-700" @click="addRow">+ Add school</button>
    </div>

    <p v-if="!modelValue.length" class="text-xs text-slate-500">
      Add your nursing degree or relevant education for the VMS packet.
    </p>
    <button
      v-if="!modelValue.length"
      id="intake-field-education"
      type="button"
      class="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-brand-700"
      @click="addRow"
    >
      + Add your first school
    </button>

    <div
      v-for="(row, index) in modelValue"
      :key="index"
      class="space-y-2 rounded-lg border border-slate-200 p-3"
    >
      <div class="flex justify-between">
        <span class="text-xs font-medium text-slate-600">School {{ index + 1 }}</span>
        <button type="button" class="text-xs text-red-600" @click="removeRow(index)">Remove</button>
      </div>
      <input
        :id="`intake-field-education-${index}-degree`"
        :value="row.degree || ''"
        placeholder="Degree (e.g. BSN)"
        class="field"
        @input="patchRow(index, { degree: ($event.target as HTMLInputElement).value })"
      >
      <input
        :id="`intake-field-education-${index}-school`"
        :value="row.school || ''"
        placeholder="School name"
        class="field"
        @input="patchRow(index, { school: ($event.target as HTMLInputElement).value })"
      >
      <input
        :id="`intake-field-education-${index}-year`"
        :value="row.graduationYear || ''"
        placeholder="Graduation year"
        class="field"
        @input="patchRow(index, { graduationYear: ($event.target as HTMLInputElement).value })"
      >
    </div>
  </div>
</template>
