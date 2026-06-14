<script setup lang="ts">
import type { EducationEntry } from '~/types/candidate'
import { GRADUATION_MONTH_OPTIONS } from '~/utils/educationGraduation'

const props = defineProps<{
  modelValue: EducationEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EducationEntry[]]
}>()

const activeIndex = ref(-1)

watch(
  () => props.modelValue.length,
  (len, prevLen) => {
    const prev = prevLen ?? 0
    if (len > prev) {
      activeIndex.value = len - 1
    } else if (activeIndex.value >= len) {
      activeIndex.value = len > 0 ? len - 1 : -1
    }
  },
)

function addRow() {
  emit('update:modelValue', [...props.modelValue, {}])
}

function removeRow(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
  if (activeIndex.value === index) {
    activeIndex.value = next.length ? Math.min(index, next.length - 1) : -1
  } else if (activeIndex.value > index) {
    activeIndex.value -= 1
  }
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

function graduationSummary(row: EducationEntry) {
  const month = row.graduationMonth?.trim()
  const year = row.graduationYear?.trim()
  if (!month && !year) return 'Graduation not set'
  const monthLabel = GRADUATION_MONTH_OPTIONS.find(o => o.value === month)?.label
  if (monthLabel && year) return `${monthLabel} ${year}`
  return year || monthLabel || 'Graduation not set'
}

function rowSummary(row: EducationEntry) {
  const degree = row.degree?.trim() || 'Degree not set'
  const school = row.school?.trim() || 'School not set'
  return `${degree} · ${school} · ${graduationSummary(row)}`
}

function openCard(index: number) {
  if (activeIndex.value === index) return
  activeIndex.value = index
}

async function openEducationField(fieldId: string): Promise<boolean> {
  const match = fieldId.match(/^education-(\d+)-/)
  if (!match) return false
  const index = Number(match[1])
  if (index < 0 || index >= props.modelValue.length) return false
  activeIndex.value = index
  await nextTick()
  document.getElementById(`education-card-${index}`)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'nearest',
  })
  return true
}

defineExpose({ openEducationField })
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

    <ul v-else class="space-y-2">
      <li
        v-for="(row, index) in modelValue"
        :key="index"
        :id="`education-card-${index}`"
        class="overflow-hidden rounded-lg border bg-white"
        :class="activeIndex === index ? 'border-brand-200 border-l-4 border-l-brand-600 shadow-md' : 'border-slate-200 shadow-sm'"
      >
        <div class="flex items-start gap-1">
          <button
            :id="`education-card-header-${index}`"
            type="button"
            class="min-w-0 flex-1 rounded-lg p-3 text-left"
            :aria-expanded="activeIndex === index"
            :aria-controls="`education-panel-${index}`"
            @click="openCard(index)"
          >
            <p class="text-sm font-medium text-slate-900">{{ rowSummary(row) }}</p>
          </button>
          <div class="flex shrink-0 items-center self-center pr-2">
            <button type="button" class="text-sm text-red-600" @click="removeRow(index)">Remove</button>
          </div>
        </div>

        <div
          class="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
          :class="activeIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        >
          <div
            :id="`education-panel-${index}`"
            class="min-h-0 overflow-hidden"
            :aria-hidden="activeIndex !== index"
            :class="activeIndex !== index && 'pointer-events-none'"
          >
            <div class="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
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
        </div>
      </li>
    </ul>
  </div>
</template>
