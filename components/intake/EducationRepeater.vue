<script setup lang="ts">
import type { EducationEntry } from '~/types/candidate'
import { GRADUATION_MONTH_OPTIONS } from '~/utils/educationGraduation'

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

const { fieldClasses, clearParseHighlight } = useIntakePrefillHighlight()

function educationFieldId(index: number, suffix: string) {
  return `education-${index}-${suffix}`
}

function patchEducationField(index: number, suffix: string, partial: Partial<EducationEntry>) {
  clearParseHighlight(educationFieldId(index, suffix))
  patchRow(index, partial)
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
      <div class="flex justify-end">
        <button type="button" class="text-xs text-red-600" @click="removeRow(index)">Remove</button>
      </div>
      <label class="block" :for="`intake-field-${educationFieldId(index, 'degree')}`">
        <span class="field-label-compact">Degree</span>
        <input
          :id="`intake-field-${educationFieldId(index, 'degree')}`"
          :value="row.degree || ''"
          placeholder="e.g. BSN"
          :class="fieldClasses(educationFieldId(index, 'degree'))"
          @input="patchEducationField(index, 'degree', { degree: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <label class="block" :for="`intake-field-${educationFieldId(index, 'school')}`">
        <span class="field-label-compact">School</span>
        <input
          :id="`intake-field-${educationFieldId(index, 'school')}`"
          :value="row.school || ''"
          placeholder="School name"
          :class="fieldClasses(educationFieldId(index, 'school'))"
          @input="patchEducationField(index, 'school', { school: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <fieldset class="space-y-2">
        <legend class="field-label-compact">Graduation date</legend>
        <div class="grid grid-cols-2 gap-2">
          <label class="block" :for="`intake-field-${educationFieldId(index, 'month')}`">
            <span class="sr-only">Graduation month</span>
            <select
              :id="`intake-field-${educationFieldId(index, 'month')}`"
              :value="row.graduationMonth || ''"
              :class="fieldClasses(educationFieldId(index, 'month'))"
              @change="patchEducationField(index, 'month', { graduationMonth: ($event.target as HTMLSelectElement).value || undefined })"
            >
              <option value="">Month</option>
              <option
                v-for="option in GRADUATION_MONTH_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="block" :for="`intake-field-${educationFieldId(index, 'year')}`">
            <span class="sr-only">Graduation year</span>
            <input
              :id="`intake-field-${educationFieldId(index, 'year')}`"
              :value="row.graduationYear || ''"
              placeholder="YYYY"
              inputmode="numeric"
              maxlength="4"
              :class="fieldClasses(educationFieldId(index, 'year'))"
              @input="patchEducationField(index, 'year', { graduationYear: ($event.target as HTMLInputElement).value })"
            >
          </label>
        </div>
      </fieldset>
    </div>
  </div>
</template>
